import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useToolBridge } from '../hooks/useToolBridge';
import { ToolComponentProps } from '../types';

const DEMO_JSON = `{
  "id": 123,
  "name": "暖心工具箱",
  "isActive": true,
  "tags": ["dev", "tool", "local"],
  "author": {
    "id": 1,
    "email": "admin@nuanxin.xyz"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "stats": {
    "views": 0,
    "likes": null
  }
}`;

// 推断 TypeScript 类型
const inferType = (value: any, optionalKeys: Set<string>, rootName: string, depth = 0): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const elemTypes = value.map((v) => inferType(v, optionalKeys, rootName, depth + 1));
    const unique = Array.from(new Set(elemTypes));
    // 若元素都是同一对象结构,合并;否则联合
    if (unique.length === 1) return unique[0] + '[]';
    return `(${unique.join(' | ')})[]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return 'Record<string, unknown>';
    const fields = entries.map(([k, v]) => {
      const t = inferType(v, optionalKeys, rootName, depth + 1);
      // 处理 null 的字段标记为可选
      const isNullable = v === null;
      const opt = isNullable ? '?' : '';
      return `  ${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`}${opt}: ${t};`;
    });
    return `{\n${fields.join('\n')}\n${'  '.repeat(depth)}}`;
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
};

// 把 null 联合类型字段标记为可选
const markOptionalNulls = (obj: any, path = ''): string[] => {
  const result: string[] = [];
  if (obj === null || typeof obj !== 'object') return result;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => result.push(...markOptionalNulls(item, `${path}[${i}]`)));
    return result;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;
    if (v === null) result.push(p);
    if (v && typeof v === 'object') result.push(...markOptionalNulls(v, p));
  }
  return result;
};

// 生成完整 TS 代码
const generateTs = (json: any, rootName: string): string => {
  const interfaces: string[] = [];
  const seen = new Map<string, string>(); // 结构指纹 -> 名字

  const buildName = (path: string) => {
    if (!path) return rootName;
    const parts = path.split('.');
    const last = parts[parts.length - 1];
    // 转成 PascalCase
    return last
      .replace(/[_-](\w)/g, (_, c) => c.toUpperCase())
      .replace(/^(\w)/, (_, c) => c.toUpperCase());
  };

  const walk = (value: any, name: string, path: string): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'unknown[]';
      // 对数组元素用索引 0 的结构
      const elemName = buildName(path) + 'Item';
      const elemType = walk(value[0], elemName, `${path}[]`);
      return `${elemType}[]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) return 'Record<string, unknown>';
      // 生成结构指纹
      const fingerprint = entries.map(([k, v]) => `${k}:${Array.isArray(v) ? '[]' : typeof v}`).join('|');
      let ifaceName = name;
      if (seen.has(fingerprint)) {
        ifaceName = seen.get(fingerprint)!;
      } else {
        seen.set(fingerprint, name);
        const fields = entries.map(([k, v]) => {
          const childPath = path ? `${path}.${k}` : k;
          const t = walk(v, buildName(childPath), childPath);
          const isNullable = v === null;
          const opt = isNullable ? '?' : '';
          const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
          return `  ${safeKey}${opt}: ${t};`;
        });
        interfaces.push(`interface ${name} {\n${fields.join('\n')}\n}`);
      }
      return ifaceName;
    }
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'unknown';
  };

  walk(json, rootName, '');
  return interfaces.join('\n\n');
};

export const JsonToTs: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [input, setInput] = useState(DEMO_JSON);
  const [output, setOutput] = useState('');
  const [rootName, setRootName] = useState('RootObject');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { pendingTransfer, consumeTransfer } = useToolBridge();

  // 接收来自其他工具的数据
  useEffect(() => {
    if (pendingTransfer) {
      setInput(pendingTransfer.data);
      consumeTransfer();
    }
  }, [pendingTransfer, consumeTransfer]);

  const handleGenerate = () => {
    if (!input.trim()) {
      setError('请输入 JSON');
      setOutput('');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const ts = generateTs(parsed, rootName || 'RootObject');
      setOutput(ts);
      setError(null);
      onRecordUsage();
    } catch (err: any) {
      setError(`JSON 解析失败:${err.message}`);
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
            生成选项
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">根接口名称</label>
            <input
              type="text"
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              placeholder="RootObject"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700"
            />
          </div>

          <button
            onClick={handleGenerate}
            className="w-full cursor-pointer bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Icon name="Wand2" size={14} />
            生成 TypeScript
          </button>

          <div className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-md border border-slate-200 leading-relaxed">
            <strong>特性:</strong> 自动推断嵌套对象、数组、null 联合类型,null 字段标记为可选。
          </div>
        </div>
      </div>

      <div className="lg:col-span-9 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="FileCode" size={16} />
              </span>
              <span className="font-semibold text-slate-900 text-sm">JSON → TypeScript</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInput(DEMO_JSON)}
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">JSON 输入</div>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                placeholder='{"key": "value", ...}'
                className="w-full h-[400px] font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 outline-hidden focus:ring-2 focus:ring-black/20 focus:border-black resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
            <div className="p-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">TypeScript 输出</div>
              <pre className="w-full h-[400px] font-mono text-xs bg-slate-950 text-sky-300 p-4 rounded-xl border border-slate-800 overflow-auto whitespace-pre-wrap break-all leading-relaxed">
                {output || <span className="text-slate-600 italic">点击"生成 TypeScript"后结果将显示在这里...</span>}
              </pre>
            </div>
          </div>

          {output && (
            <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-500 font-semibold">{output.split('interface').length - 1} 个接口</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 font-bold text-xs py-1.5 px-3 rounded-md border transition-all cursor-pointer ${
                  isCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={12} />
                {isCopied ? '已复制' : '复制 TS 代码'}
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
