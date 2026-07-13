import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useToolBridge } from '../hooks/useToolBridge';

interface JsonDiffProps {
  onRecordUsage: () => void;
}

export const JsonDiff: React.FC<JsonDiffProps> = ({ onRecordUsage }) => {
  const [jsonLeft, setJsonLeft] = useState<string>(`{\n  "name": "暖心工具箱",\n  "version": "1.0.0",\n  "active": true,\n  "tags": ["react", "vite", "tailwind"],\n  "configs": {\n    "port": 3000,\n    "gzip": true\n  }\n}`);
  const [jsonRight, setJsonRight] = useState<string>(`{\n  "name": "暖心工具箱",\n  "version": "1.1.0",\n  "active": false,\n  "tags": ["react", "vite", "tailwind", "motion"],\n  "configs": {\n    "port": 3000,\n    "gzip": false,\n    "ssl": true\n  }\n}`);
  const [diffResults, setDiffResults] = useState<Array<{ path: string; type: 'add' | 'remove' | 'update'; leftVal: string; rightVal: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSame, setIsSame] = useState<boolean | null>(null);
  const { pendingTransfer, consumeTransfer } = useToolBridge('json-diff');

  useEffect(() => {
    if (!pendingTransfer) return;
    setJsonLeft(pendingTransfer.data);
    setDiffResults([]);
    setErrorMessage(null);
    setIsSame(null);
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);

  const handleCompare = () => {
    onRecordUsage();
    setErrorMessage(null);
    setDiffResults([]);
    setIsSame(null);

    try {
      const leftObj = JSON.parse(jsonLeft);
      const rightObj = JSON.parse(jsonRight);

      const diffList: typeof diffResults = [];

      const deepCompare = (left: any, right: any, path: string) => {
        if (typeof left !== typeof right) {
          diffList.push({
            path,
            type: 'update',
            leftVal: `${typeof left} (${JSON.stringify(left)})`,
            rightVal: `${typeof right} (${JSON.stringify(right)})`,
          });
          return;
        }

        if (Array.isArray(left) && Array.isArray(right)) {
          // Compare arrays simply
          if (JSON.stringify(left) !== JSON.stringify(right)) {
            diffList.push({
              path,
              type: 'update',
              leftVal: JSON.stringify(left),
              rightVal: JSON.stringify(right),
            });
          }
          return;
        }

        if (left && typeof left === 'object' && right && typeof right === 'object') {
          const allKeys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
          for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            if (!(key in left)) {
              diffList.push({
                path: currentPath,
                type: 'add',
                leftVal: '(不存在)',
                rightVal: JSON.stringify(right[key]),
              });
            } else if (!(key in right)) {
              diffList.push({
                path: currentPath,
                type: 'remove',
                leftVal: JSON.stringify(left[key]),
                rightVal: '(已删除)',
              });
            } else {
              deepCompare(left[key], right[key], currentPath);
            }
          }
        } else {
          if (left !== right) {
            diffList.push({
              path,
              type: 'update',
              leftVal: JSON.stringify(left),
              rightVal: JSON.stringify(right),
            });
          }
        }
      };

      deepCompare(leftObj, rightObj, '');

      setDiffResults(diffList);
      setIsSame(diffList.length === 0);
    } catch (err: any) {
      setErrorMessage(`JSON 解析失败: ${err.message || '请确保输入的均为有效 JSON 格式数据。'}`);
    }
  };

  const handleFormat = (side: 'left' | 'right') => {
    try {
      if (side === 'left') {
        setJsonLeft(JSON.stringify(JSON.parse(jsonLeft), null, 2));
      } else {
        setJsonRight(JSON.stringify(JSON.parse(jsonRight), null, 2));
      }
    } catch (err: any) {
      setErrorMessage(`格式化失败: ${err.message}`);
    }
  };

  return (
    <div id="json-diff-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Inputs Side-by-Side */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* JSON Left */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                原始数据 (JSON A)
              </span>
              <button
                onClick={() => handleFormat('left')}
                className="text-[10px] text-slate-800 font-bold hover:underline cursor-pointer"
              >
                美化格式
              </button>
            </div>
            <textarea
              value={jsonLeft}
              onChange={(e) => setJsonLeft(e.target.value)}
              placeholder="在此粘贴第一个 JSON 对象..."
              rows={12}
              className="w-full text-xs font-mono bg-white p-3 border-0 outline-hidden focus:ring-0 resize-none text-slate-800 leading-normal min-h-[250px]"
            />
          </div>

          {/* JSON Right */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-900" />
                修改数据 (JSON B)
              </span>
              <button
                onClick={() => handleFormat('right')}
                className="text-[10px] text-slate-800 font-bold hover:underline cursor-pointer"
              >
                美化格式
              </button>
            </div>
            <textarea
              value={jsonRight}
              onChange={(e) => setJsonRight(e.target.value)}
              placeholder="在此粘贴对比的第二个 JSON 对象..."
              rows={12}
              className="w-full text-xs font-mono bg-white p-3 border-0 outline-hidden focus:ring-0 resize-none text-slate-800 leading-normal min-h-[250px]"
            />
          </div>
        </div>

        <button
          onClick={handleCompare}
          className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Icon name="Shuffle" size={14} />
          执行一键差异树比对 (JSON Deep Diff)
        </button>
      </div>

      {/* Comparisons results - Right */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="GitCompare" size={16} />
              </span>
              差异结构列表
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1 overflow-auto max-h-[400px]">
            {errorMessage && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold flex items-center gap-2">
                <Icon name="AlertTriangle" size={14} />
                <span>{errorMessage}</span>
              </div>
            )}

            {isSame === true && (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <Icon name="CheckCircle" className="text-emerald-600" size={32} />
                <p className="text-sm font-semibold text-slate-700">没有检测到差异</p>
                <span className="text-[11px] text-slate-400">两份 JSON 的所有键名和对应键值在结构树上均保持 100% 绝对一致。</span>
              </div>
            )}

            {isSame === false && diffResults.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  检测到 {diffResults.length} 处不一致：
                </span>
                <div className="flex flex-col gap-2">
                  {diffResults.map((diff, index) => (
                    <div key={index} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-0.5">
                        <span className="font-mono text-xs text-slate-800 font-bold break-all">
                          {diff.path || '根节点'}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            diff.type === 'add'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : diff.type === 'remove'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {diff.type === 'add' ? '新增' : diff.type === 'remove' ? '删除' : '变更'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono leading-relaxed text-slate-500">
                        <div className="break-all border-r border-slate-200/50 pr-1">
                          <span className="font-bold block text-slate-400">A 数据:</span>
                          <span className={diff.type === 'remove' ? 'text-rose-600 font-bold' : ''}>
                            {diff.leftVal}
                          </span>
                        </div>
                        <div className="break-all pl-1">
                          <span className="font-bold block text-slate-400">B 数据:</span>
                          <span className={diff.type === 'add' ? 'text-emerald-600 font-bold' : diff.type === 'update' ? 'text-amber-700 font-bold' : ''}>
                            {diff.rightVal}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isSame === null && !errorMessage && (
              <div className="text-center text-slate-400 py-16">
                <Icon name="Shuffle" size={36} className="mx-auto text-slate-300 mb-2 animate-pulse" />
                <p className="text-xs font-semibold">请在左侧输入需要比对的 JSON 并执行计算</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
