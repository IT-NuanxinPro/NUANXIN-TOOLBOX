import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';
import { useToolBridge } from '../hooks/useToolBridge';

const DEMO_SQL = `select u.id, u.name, u.email, count(o.id) as order_count from users u left join orders o on o.user_id = u.id where u.status = 'active' and u.created_at > '2025-01-01' group by u.id, u.name, u.email having count(o.id) > 5 order by order_count desc limit 20;`;

type Dialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'mariadb' | 'tsql' | 'bigquery';

const DIALECT_OPTIONS: { value: Dialect; label: string }[] = [
  { value: 'sql', label: 'Standard SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'tsql', label: 'SQL Server (T-SQL)' },
  { value: 'bigquery', label: 'BigQuery' },
];

const loadSqlFormatter = () => import('sql-formatter').then((module) => module.format);

export const SqlFormatter: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [input, setInput] = useState<string>(DEMO_SQL);
  const [output, setOutput] = useState<string>('');
  const [dialect, setDialect] = useState<Dialect>('sql');
  const [indent, setIndent] = useState<'2' | '4' | 'tab'>('2');
  const [keywordCase, setKeywordCase] = useState<'upper' | 'lower' | 'preserve'>('upper');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [processingAction, setProcessingAction] = useState<'format' | 'compress' | null>(null);
  const { pendingTransfer, consumeTransfer } = useToolBridge('sql-formatter');

  useEffect(() => {
    if (!pendingTransfer) return;
    setInput(pendingTransfer.data);
    setOutput('');
    setError(null);
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);

  const handleFormat = async () => {
    if (!input.trim()) {
      setError('请输入 SQL 语句');
      setOutput('');
      return;
    }
    try {
      setProcessingAction('format');
      const format = await loadSqlFormatter();
      const formatted = format(input, {
        language: dialect as any,
        tabWidth: indent === 'tab' ? 1 : parseInt(indent),
        useTabs: indent === 'tab',
        keywordCase,
      });
      setOutput(formatted);
      setError(null);
      onRecordUsage();
    } catch (err: any) {
      setError(`SQL 解析失败:${err.message}`);
      setOutput('');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCompress = async () => {
    if (!input.trim()) {
      setError('请输入 SQL 语句');
      return;
    }
    try {
      setProcessingAction('compress');
      const format = await loadSqlFormatter();
      const compressed = format(input, {
        language: dialect as any,
        tabWidth: 0,
        keywordCase,
      });
      setOutput(compressed.replace(/\s+/g, ' ').trim());
      setError(null);
      onRecordUsage();
    } catch (err: any) {
      setError(`SQL 解析失败:${err.message}`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    onRecordUsage();
  };

  // SQL 关键字高亮
  const highlightSql = (sql: string) => {
    const keywords = /\b(SELECT|FROM|WHERE|AND|OR|LEFT|RIGHT|INNER|OUTER|JOIN|ON|GROUP|BY|HAVING|ORDER|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|ADD|AS|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|IN|NOT|NULL|IS|LIKE|BETWEEN|EXISTS|COUNT|SUM|AVG|MIN|MAX|WITH|RECURSIVE)\b/i;
    const functions = /\b(COUNT|SUM|AVG|MIN|MAX|NOW|DATE|COALESCE|CAST|CONCAT|LENGTH|LOWER|UPPER|TRIM|ROUND|ABS)\b/i;
    const parts = sql.split(/(\s+|[(),;])/);
    return parts.map((part, i) => {
      if (keywords.test(part)) {
        return <span key={i} className="text-purple-400 font-bold">{part}</span>;
      }
      if (functions.test(part)) {
        return <span key={i} className="text-sky-400 font-bold">{part}</span>;
      }
      if (/^['"`].*['"`]$/.test(part)) {
        return <span key={i} className="text-emerald-400">{part}</span>;
      }
      if (/^\d+$/.test(part)) {
        return <span key={i} className="text-amber-400">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 左侧控制面板 */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Icon name="Sliders" size={16} />
            格式化选项
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">SQL 方言</label>
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value as Dialect)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700 cursor-pointer"
            >
              {DIALECT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">缩进大小</label>
            <select
              value={indent}
              onChange={(e) => setIndent(e.target.value as '2' | '4' | 'tab')}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700 cursor-pointer"
            >
              <option value="2">2 空格</option>
              <option value="4">4 空格</option>
              <option value="tab">Tab</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">关键字大小写</label>
            <select
              value={keywordCase}
              onChange={(e) => setKeywordCase(e.target.value as 'upper' | 'lower' | 'preserve')}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700 cursor-pointer"
            >
              <option value="upper">大写 (SELECT)</option>
              <option value="lower">小写 (select)</option>
              <option value="preserve">保持原样</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleFormat}
              disabled={processingAction !== null}
              className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Icon name={processingAction === 'format' ? 'Loader2' : 'Wand2'} size={14} className={processingAction === 'format' ? 'animate-spin' : ''} />
              {processingAction === 'format' ? '格式化中...' : '格式化 SQL'}
            </button>
            <button
              onClick={handleCompress}
              disabled={processingAction !== null}
              className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-1.5"
            >
              <Icon name={processingAction === 'compress' ? 'Loader2' : 'Minimize2'} size={14} className={processingAction === 'compress' ? 'animate-spin' : ''} />
              {processingAction === 'compress' ? '压缩中...' : '压缩成单行'}
            </button>
          </div>

          <div className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-md border border-slate-200 leading-relaxed">
            <strong>支持:</strong> SELECT / INSERT / UPDATE / DELETE / CREATE / DDL 等。所有解析在本地完成,不上传。
          </div>
        </div>
      </div>

      {/* 右侧编辑器 */}
      <div className="lg:col-span-9 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Database" size={16} />
              </span>
              <span className="font-semibold text-slate-900 text-sm">SQL 输入</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInput(DEMO_SQL)}
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
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                placeholder="粘贴或输入需要格式化的 SQL 语句..."
                className="w-full h-[400px] font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 outline-hidden focus:ring-2 focus:ring-black/20 focus:border-black resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
            <div className="p-5">
              <div className="w-full h-[400px] font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 overflow-auto whitespace-pre-wrap break-all leading-relaxed">
                {output ? highlightSql(output) : <span className="text-slate-600 italic">格式化结果将显示在这里...</span>}
              </div>
            </div>
          </div>

          {output && (
            <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-500 font-semibold">输出 {output.length} 字符 · {output.split('\n').length} 行</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 font-bold text-xs py-1.5 px-3 rounded-md border transition-all cursor-pointer ${
                  isCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={12} />
                {isCopied ? '已复制' : '复制结果'}
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
