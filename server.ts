import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from 'dotenv';
import { TOOL_REGISTRY } from './src/registry';

config({ path: '.env.local' });
config();

const app = express();
const port = Number(process.env.AI_PROXY_PORT || 3001);
const apiKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY || '';
const baseUrl = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
const model = process.env.AI_MODEL || 'qwen/qwen3-32b';
const perClientDailyLimit = Math.max(1, Number(process.env.AI_DAILY_LIMIT || 20));

const allowedOrigins = new Set(
  (process.env.AI_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

interface RateBucket {
  day: string;
  count: number;
}

const rateBuckets = new Map<string, RateBucket>();

const toolDirectory = TOOL_REGISTRY
  .map((tool) => `- ${tool.id}: ${tool.title}（${tool.description}）`)
  .join('\n');

const systemPrompt = `你是“暖心 AI”，暖心工具箱内的中文开发助手。
你的职责是理解用户任务、解释开发问题，并优先推荐工具箱中已有的本地工具。

可用工具：
${toolDirectory}

规则：
1. 回答简洁、准确、以可执行步骤为主，不虚构已经执行的操作。
2. 当已有工具适合时，在回答末尾追加一个或多个操作标记，格式必须是 [[tool:工具ID|按钮文案]]。
3. 工具 ID 只能来自上面的列表；没有合适工具时不要输出操作标记。
4. 遇到私钥、密码、访问令牌等敏感数据时，提醒用户脱敏，并优先建议本地处理。
5. 默认使用简体中文，可使用 Markdown。`;

app.use(express.json({ limit: '32kb' }));

app.use((request: Request, response: Response, next: NextFunction) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    response.status(403).json({ error: '当前站点不允许访问 AI 代理。' });
    return;
  }

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }

  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }
  next();
});

function getClientId(request: Request) {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return forwardedIp?.trim() || request.ip || 'unknown';
}

function consumeDailyQuota(clientId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const bucket = rateBuckets.get(clientId);
  if (!bucket || bucket.day !== day) {
    rateBuckets.set(clientId, { day, count: 1 });
    return true;
  }
  if (bucket.count >= perClientDailyLimit) return false;
  bucket.count += 1;
  return true;
}

app.get('/api/ai/health', (_request, response) => {
  response.json({
    configured: Boolean(apiKey),
    model,
    provider: new URL(baseUrl).hostname,
  });
});

app.post('/api/ai/chat', async (request, response) => {
  if (!apiKey) {
    response.status(503).json({ error: 'AI 服务尚未配置，请先在 .env.local 中设置 AI_API_KEY。' });
    return;
  }

  const rawMessages = Array.isArray(request.body?.messages) ? request.body.messages : [];
  const messages = rawMessages
    .filter((message) => message && (message.role === 'user' || message.role === 'assistant'))
    .slice(-12)
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: String(message.content || '').slice(0, 12_000),
    }))
    .filter((message) => message.content.trim());

  if (messages.length === 0) {
    response.status(400).json({ error: '请输入要咨询的问题。' });
    return;
  }

  const totalLength = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (totalLength > 24_000) {
    response.status(413).json({ error: '对话内容过长，请清空历史或缩短输入后重试。' });
    return;
  }

  const clientId = getClientId(request);
  if (!consumeDailyQuota(clientId)) {
    response.status(429).json({ error: '今天的免费 AI 次数已用完，本地工具仍可正常使用，请明天再试。' });
    return;
  }

  const context = request.body?.context || {};
  const contextPrompt = context.activeToolTitle
    ? `当前页面工具：${String(context.activeToolTitle).slice(0, 100)}\n工具说明：${String(context.activeToolDescription || '').slice(0, 500)}`
    : '当前位于开发工作台首页。';

  try {
    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(baseUrl.includes('openrouter.ai')
          ? {
              'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
              'X-Title': 'NUANXIN TOOLBOX',
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `${systemPrompt}\n\n${contextPrompt}` },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 1_000,
        stream: false,
      }),
    });

    const payload = await upstreamResponse.json().catch(() => ({})) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!upstreamResponse.ok) {
      const status = upstreamResponse.status === 429 ? 429 : 502;
      response.status(status).json({
        error: upstreamResponse.status === 429
          ? '免费模型当前请求较多，请稍后再试。'
          : payload.error?.message || '上游 AI 服务暂时不可用。',
      });
      return;
    }

    const message = payload.choices?.[0]?.message?.content?.trim();
    if (!message) {
      response.status(502).json({ error: '上游 AI 服务返回了空内容。' });
      return;
    }

    response.json({ message });
  } catch (error) {
    console.error('AI proxy request failed:', error);
    response.status(502).json({ error: '无法连接 AI 服务，请检查网络后重试。' });
  }
});

app.listen(port, () => {
  console.log(`NUANXIN AI proxy is running at http://localhost:${port}`);
  console.log(`Provider: ${baseUrl} | Model: ${model} | Configured: ${Boolean(apiKey)}`);
});
