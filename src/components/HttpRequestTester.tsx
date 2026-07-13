import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';
import { useToolBridge } from '../hooks/useToolBridge';
import { parseCurlCommand } from '../utils/curlParser';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface HeaderRow { id: string; key: string; value: string; enabled: boolean }

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  ok: boolean;
}

const DEMO_URL = 'https://jsonplaceholder.typicode.com/todos/1';

export const HttpRequestTester: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [url, setUrl] = useState(DEMO_URL);
  const [method, setMethod] = useState<Method>('GET');
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
  ]);
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState<'json' | 'form' | 'text'>('json');
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRespTab, setActiveRespTab] = useState<'body' | 'headers' | 'status'>('body');
  const [isCopied, setIsCopied] = useState(false);
  const { pendingTransfer, consumeTransfer } = useToolBridge('http-request-tester');

  useEffect(() => {
    if (!pendingTransfer) return;

    const parsed = parseCurlCommand(pendingTransfer.data);
    if (parsed.url) {
      setUrl(parsed.url);
      setMethod(METHODS.includes(parsed.method as Method) ? parsed.method as Method : 'GET');
      setHeaders(Object.entries(parsed.headers).map(([key, value], index) => ({
        id: `curl-header-${index}`,
        key,
        value,
        enabled: true,
      })));
      setBody(parsed.body);

      const contentType = Object.entries(parsed.headers)
        .find(([key]) => key.toLowerCase() === 'content-type')?.[1]
        .toLowerCase() || '';
      if (contentType.includes('json')) setBodyType('json');
      else if (contentType.includes('application/x-www-form-urlencoded')) setBodyType('form');
      else setBodyType('text');

      setError(null);
      setResponse(null);
    } else {
      setError('无法从传入内容中解析出请求 URL，请检查 cURL 命令格式。');
    }
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);

  const addHeader = () => {
    setHeaders([...headers, { id: `h${Date.now()}`, key: '', value: '', enabled: true }]);
  };

  const updateHeader = (id: string, field: keyof HeaderRow, value: any) => {
    setHeaders(headers.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const removeHeader = (id: string) => {
    setHeaders(headers.filter((h) => h.id !== id));
  };

  const formatJson = (str: string) => {
    try { return JSON.stringify(JSON.parse(str), null, 2); } catch { return str; }
  };

  const handleSend = async () => {
    if (!url.trim()) {
      setError('请输入请求 URL');
      return;
    }
    setLoading(true);
    setError(null);
    setResponse(null);
    const start = performance.now();
    try {
      const opts: RequestInit = { method };
      // headers
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.enabled && h.key.trim()) headerObj[h.key] = h.value;
      });
      if (method !== 'GET' && method !== 'HEAD' && body.trim()) {
        if (bodyType === 'json') {
          headerObj['Content-Type'] = headerObj['Content-Type'] || 'application/json';
          opts.body = body;
        } else if (bodyType === 'form') {
          const form = new URLSearchParams();
          try {
            const obj = JSON.parse(body);
            Object.entries(obj).forEach(([k, v]) => form.append(k, String(v)));
          } catch {
          }
          opts.body = form.toString();
          headerObj['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
          opts.body = body;
          headerObj['Content-Type'] = headerObj['Content-Type'] || 'text/plain';
        }
      }
      if (Object.keys(headerObj).length > 0) opts.headers = headerObj;

      const res = await fetch(url, opts);
      const duration = Math.round(performance.now() - start);
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { respHeaders[k] = v; });
      const respBody = await res.text();
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: respHeaders,
        body: respBody,
        duration,
        ok: res.ok,
      });
      setActiveRespTab('body');
      onRecordUsage();
    } catch (err: any) {
      setError(`请求失败: ${err.message}\n\n常见原因:\n- 目标服务器未配置 CORS(跨域资源共享)\n- 网络不通或 URL 错误\n- 浏览器安全策略拦截`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResp = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.body);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    onRecordUsage();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 左侧配置 */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* URL 行 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
              className="text-xs font-bold bg-slate-900 text-white rounded-md py-2 px-3 cursor-pointer outline-none"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-black font-mono text-slate-700"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold rounded-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="Send" size={12} />}
              {loading ? '发送中...' : '发送'}
            </button>
          </div>
        </div>

        {/* 请求头 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
              <Icon name="List" size={14} />
              请求头 Headers
            </span>
            <button onClick={addHeader} className="text-[10px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer">
              <Icon name="Plus" size={10} /> 新增
            </button>
          </div>
          <div className="p-4 flex flex-col gap-2 max-h-[200px] overflow-y-auto">
            {headers.map((h) => (
              <div key={h.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={h.enabled}
                  onChange={(e) => updateHeader(h.id, 'enabled', e.target.checked)}
                  className="h-3.5 w-3.5 accent-slate-900"
                />
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => updateHeader(h.id, 'key', e.target.value)}
                  placeholder="Header 名"
                  className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-black"
                />
                <input
                  type="text"
                  value={h.value}
                  onChange={(e) => updateHeader(h.id, 'value', e.target.value)}
                  placeholder="值"
                  className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-black"
                />
                <button
                  onClick={() => removeHeader(h.id)}
                  className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 请求体 */}
        {method !== 'GET' && method !== 'HEAD' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <Icon name="FileText" size={14} />
                请求体 Body
              </span>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-md">
                {(['json', 'form', 'text'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBodyType(t)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer uppercase ${
                      bodyType === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={bodyType === 'json' ? '{"key": "value"}' : bodyType === 'form' ? '{"key":"value"} (自动转 form)' : '纯文本内容'}
              className="w-full h-[160px] font-mono text-xs bg-slate-950 text-slate-100 p-4 outline-none resize-none border-0"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        )}
      </div>

      {/* 右侧响应 */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <Icon name="Server" size={14} />
                响应
              </span>
              {response && (
                <button
                  onClick={handleCopyResp}
                  className={`flex items-center gap-1 font-bold text-[10px] py-1 px-2 rounded-md border transition-all cursor-pointer ${
                    isCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Icon name={isCopied ? 'Check' : 'Copy'} size={10} />
                  {isCopied ? '已复制' : '复制 Body'}
                </button>
              )}
            </div>
            {response && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  response.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-[10px] text-slate-500 font-bold">耗时 {response.duration}ms</span>
                <span className="text-[10px] text-slate-500 font-bold">{response.body.length} 字符</span>
              </div>
            )}
          </div>

          {response && (
            <div className="flex border-b border-slate-100 bg-white">
              {(['body', 'headers', 'status'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveRespTab(t)}
                  className={`flex-1 text-[10px] font-bold py-2 transition-all cursor-pointer border-b-2 ${
                    activeRespTab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'body' ? 'Body' : t === 'headers' ? 'Headers' : '状态'}
                </button>
              ))}
            </div>
          )}

          <div className="p-4">
            {error ? (
              <pre className="text-[11px] text-red-600 bg-red-50 rounded-md p-3 border border-red-100 whitespace-pre-wrap break-all max-h-[400px] overflow-auto font-mono">
                {error}
              </pre>
            ) : response ? (
              activeRespTab === 'body' ? (
                <pre className="text-[11px] text-slate-700 bg-slate-950 text-emerald-300 rounded-md p-3 whitespace-pre-wrap break-all max-h-[400px] overflow-auto font-mono">
                  {bodyType === 'json' || response.headers['content-type']?.includes('json')
                    ? formatJson(response.body)
                    : response.body}
                </pre>
              ) : activeRespTab === 'headers' ? (
                <div className="max-h-[400px] overflow-auto">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-[11px] py-1 border-b border-slate-50 last:border-0">
                      <span className="font-mono font-bold text-slate-700 shrink-0">{k}:</span>
                      <span className="font-mono text-slate-500 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-600 flex flex-col gap-2">
                  <div>状态码: <strong className="text-slate-900">{response.status}</strong></div>
                  <div>状态文本: <strong className="text-slate-900">{response.statusText}</strong></div>
                  <div>响应成功: <strong className={response.ok ? 'text-emerald-600' : 'text-red-600'}>{response.ok ? '是' : '否'}</strong></div>
                  <div>总耗时: <strong className="text-slate-900">{response.duration}ms</strong></div>
                </div>
              )
            ) : (
              <div className="text-center text-slate-400 text-xs py-12">
                <Icon name="Inbox" size={28} className="mx-auto mb-2 opacity-50" />
                点击"发送"按钮查看响应
              </div>
            )}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 bg-amber-50 p-2.5 rounded-md border border-amber-200 leading-relaxed">
          <strong className="text-amber-700">注意:</strong> 由于浏览器 CORS 策略,部分接口可能无法直接请求。若需测试跨域接口,请确认目标服务器返回了正确的 CORS 头。
        </div>
      </div>
    </div>
  );
};
