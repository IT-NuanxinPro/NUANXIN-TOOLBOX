import React, { useState } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

const DEMO_CURL = `curl -X POST 'https://api.example.com/v1/users' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.xxx' \\
  -d '{"name":"暖心","role":"admin","skills":["react","node"]}'`;

// 解析 curl 命令
interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

const parseCurl = (raw: string): ParsedCurl => {
  // 规范化:合并续行,去头
  const lines = raw.replace(/\\\s*\n\s*/g, ' ').split('\n');
  const joined = lines.join(' ').trim();

  // 提取 URL:支持 -X 'URL' / --url 'URL' / 直接 URL / -X URL
  const urlMatch =
    joined.match(/(?:curl\s+(?:-[^\s]+\s+(?:'[^']*'|"[^"]*"|\S+)\s+)*)['"]?(https?:\/\/[^\s'"]+)['"]?/) ||
    joined.match(/--url\s+['"]?([^\s'"]+)['"]?/) ||
    joined.match(/curl\s+['"]?(https?:\/\/[^\s'"]+)['"]?/);

  const url = urlMatch ? urlMatch[1] : '';

  // 方法
  let method = 'GET';
  const methodMatch = joined.match(/-X\s+(\w+)/) || joined.match(/--request\s+(\w+)/);
  if (methodMatch) method = methodMatch[1].toUpperCase();

  // headers
  const headers: Record<string, string> = {};
  const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = headerRegex.exec(joined)) !== null) {
    const [k, ...rest] = m[1].split(':');
    headers[k.trim()] = rest.join(':').trim();
  }

  // body
  let body = '';
  const bodyMatch =
    joined.match(/(?:-d|--data|--data-raw)\s+['"]([\s\S]+?)['"]/) ||
    joined.match(/(?:-d|--data|--data-raw)\s+(\S+)/);
  if (bodyMatch) {
    body = bodyMatch[1];
    if (method === 'GET') method = 'POST';
  }

  return { url, method, headers, body };
};

const toFetch = (c: ParsedCurl): string => {
  const opts: string[] = [];
  if (c.method !== 'GET') opts.push(`  method: '${c.method}'`);
  const headerKeys = Object.keys(c.headers);
  if (headerKeys.length > 0) {
    opts.push('  headers: {');
    headerKeys.forEach((k) => {
      opts.push(`    '${k}': '${c.headers[k]}',`);
    });
    opts.push('  }');
  }
  if (c.body) opts.push(`  body: '${c.body.replace(/'/g, "\\'")}'`);
  const optionsStr = opts.length > 0 ? `,\n${opts.join('\n')}` : '';
  return `fetch('${c.url}'${optionsStr})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
};

const toAxios = (c: ParsedCurl): string => {
  const config: string[] = [];
  config.push(`  url: '${c.url}'`);
  if (c.method !== 'GET') config.push(`  method: '${c.method.toLowerCase()}'`);
  const headerKeys = Object.keys(c.headers);
  if (headerKeys.length > 0) {
    config.push('  headers: {');
    headerKeys.forEach((k) => config.push(`    '${k}': '${c.headers[k]}',`));
    config.push('  }');
  }
  if (c.body) {
    // 尝试 JSON 解析
    try {
      const j = JSON.parse(c.body);
      config.push(`  data: ${JSON.stringify(j, null, 2).split('\n').join('\n  ')}`);
    } catch {
      config.push(`  data: '${c.body.replace(/'/g, "\\'")}'`);
    }
  }
  return `import axios from 'axios';

axios({
${config.join('\n')}
})
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`;
};

const toPythonRequests = (c: ParsedCurl): string => {
  const headerKeys = Object.keys(c.headers);
  let code = `import requests\n\n`;
  const headersStr = headerKeys.length > 0
    ? `headers = {\n${headerKeys.map((k) => `    '${k}': '${c.headers[k]}',`).join('\n')}\n}\n`
    : '';
  if (headersStr) code += headersStr;

  const hasBody = !!c.body;
  let bodyPart = '';
  if (hasBody) {
    try {
      const j = JSON.parse(c.body);
      code += `data = ${JSON.stringify(j, null, 2).replace(/^/gm, '    ').trimStart()}\n`;
      bodyPart = ', json=data';
    } catch {
      code += `data = '${c.body.replace(/'/g, "\\'")}'\n`;
      bodyPart = ', data=data';
    }
  }
  const headersArg = headerKeys.length > 0 ? ', headers=headers' : '';
  code += `\nresponse = requests.${c.method.toLowerCase()}(\n    '${c.url}'${headersArg}${bodyPart}\n)\nprint(response.status_code)\nprint(response.text)`;
  return code;
};

const toGoHttp = (c: ParsedCurl): string => {
  const headerKeys = Object.keys(c.headers);
  let code = `package main\n\nimport (\n\t"bytes"\n\t"fmt"\n\t"net/http"\n`;
  if (c.body) code += `\t"io"\n`;
  code += `)\n\nfunc main() {\n`;
  if (c.body) {
    code += `\tbody := []byte(\`${c.body.replace(/`/g, '\\`')}\`)\n`;
    code += `\treq, _ := http.NewRequest("${c.method}", "${c.url}", bytes.NewReader(body))\n`;
  } else {
    code += `\treq, _ := http.NewRequest("${c.method}", "${c.url}", nil)\n`;
  }
  headerKeys.forEach((k) => {
    code += `\treq.Header.Set("${k}", "${c.headers[k]}")\n`;
  });
  code += `\tresp, _ := http.DefaultClient.Do(req)\n\tdefer resp.Body.Close()\n`;
  if (c.body) {
    code += `\tbodyBytes, _ := io.ReadAll(resp.Body)\n\tfmt.Println(string(bodyBytes))\n`;
  } else {
    code += `\tfmt.Println(resp.Status)\n`;
  }
  code += `}\n`;
  return code;
};

type Target = 'fetch' | 'axios' | 'python' | 'go';

const TARGETS: { id: Target; label: string; lang: string }[] = [
  { id: 'fetch', label: 'JS fetch', lang: 'javascript' },
  { id: 'axios', label: 'Axios', lang: 'javascript' },
  { id: 'python', label: 'Python requests', lang: 'python' },
  { id: 'go', label: 'Go net/http', lang: 'go' },
];

export const CurlConverter: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [input, setInput] = useState(DEMO_CURL);
  const [target, setTarget] = useState<Target>('fetch');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleConvert = () => {
    if (!input.trim()) {
      setError('请输入 curl 命令');
      setOutput('');
      return;
    }
    try {
      const parsed = parseCurl(input);
      if (!parsed.url) {
        setError('未解析到 URL,请确认 curl 命令格式正确');
        setOutput('');
        return;
      }
      const map = { fetch: toFetch, axios: toAxios, python: toPythonRequests, go: toGoHttp };
      const code = map[target](parsed);
      setOutput(code);
      setError(null);
      onRecordUsage();
    } catch (err: any) {
      setError(`解析失败:${err.message}`);
      setOutput('');
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    onRecordUsage();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Icon name="Sliders" size={16} />
            目标语言
          </h4>

          <div className="flex flex-col gap-1.5">
            {TARGETS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTarget(t.id); }}
                className={`text-left text-xs px-3 py-2 rounded-md font-bold transition-colors cursor-pointer ${
                  target === t.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleConvert}
            className="w-full cursor-pointer bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Icon name="ArrowRight" size={14} />
            转换为 {TARGETS.find(t => t.id === target)?.label}
          </button>

          <div className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-md border border-slate-200 leading-relaxed">
            <strong>支持解析:</strong> -X / -H / -d / --data / -k 等常见参数。粘贴 curl 自动识别 URL、方法、请求头、请求体。
          </div>
        </div>
      </div>

      <div className="lg:col-span-9 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Terminal" size={16} />
              </span>
              <span className="font-semibold text-slate-900 text-sm">cURL → 代码</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInput(DEMO_CURL)}
                className="text-xs text-slate-800 hover:text-slate-950 font-bold px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              >
                加载示例
              </button>
              <button
                onClick={() => { setInput(''); setOutput(''); setError(null); }}
                className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors cursor-pointer"
                title="清空"
              >
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-x divide-slate-100">
            <div className="p-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">cURL 输入</div>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                placeholder="curl -X GET 'https://...' -H 'key: value'"
                className="w-full h-[400px] font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 outline-hidden focus:ring-2 focus:ring-black/20 focus:border-black resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
            <div className="p-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {TARGETS.find(t => t.id === target)?.label} 输出
              </div>
              <pre className="w-full h-[400px] font-mono text-xs bg-slate-950 text-emerald-300 p-4 rounded-xl border border-slate-800 overflow-auto whitespace-pre-wrap break-all leading-relaxed">
                {output || <span className="text-slate-600 italic">点击"转换"按钮后结果将显示在这里...</span>}
              </pre>
            </div>
          </div>

          {output && (
            <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-500 font-semibold">{output.split('\n').length} 行代码</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 font-bold text-xs py-1.5 px-3 rounded-md border transition-all cursor-pointer ${
                  isCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={12} />
                {isCopied ? '已复制' : '复制代码'}
              </button>
            </div>
          )}

          {error && (
            <div className="m-5 text-xs text-red-600 bg-red-50 rounded-md p-3 border border-red-100 flex items-start gap-2">
              <Icon name="AlertTriangle" className="shrink-0 mt-0.5 text-red-500" size={14} />
              <div><span className="font-bold">解析错误:</span> {error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
