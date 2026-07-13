export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIPageContext {
  activeToolId?: string;
  activeToolTitle?: string;
  activeToolDescription?: string;
}

interface AIChatResponse {
  message?: string;
  error?: string;
}

export async function requestAIChat(
  messages: AIChatMessage[],
  context: AIPageContext,
  signal?: AbortSignal
) {
  const apiUrl = import.meta.env.VITE_AI_API_URL?.trim() || '/api/ai/chat';
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
    signal,
  });

  const payload = (await response.json().catch(() => ({}))) as AIChatResponse;
  if (!response.ok) {
    throw new Error(payload.error || '暖心 AI 暂时无法响应，请稍后再试。');
  }

  if (!payload.message?.trim()) {
    throw new Error('AI 服务返回了空内容，请重新提问。');
  }

  return payload.message.trim();
}
