import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface DiffItem {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNum?: number;
  newLineNum?: number;
  value: string;
}

interface AlignRow {
  left: { lineNum?: number; type: 'removed' | 'unchanged' | 'empty'; value: string } | null;
  right: { lineNum?: number; type: 'added' | 'unchanged' | 'empty'; value: string } | null;
}

interface CodeDiffEditorProps {
  onRecordUsage: () => void;
}

export const CodeDiffEditor: React.FC<CodeDiffEditorProps> = ({ onRecordUsage }) => {
  const [originalText, setOriginalText] = useState<string>('');
  const [modifiedText, setModifiedText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(false);
  const [ignoreCase, setIgnoreCase] = useState<boolean>(false);

  const [diffResult, setDiffResult] = useState<DiffItem[]>([]);
  const [alignedRows, setAlignedRows] = useState<AlignRow[]>([]);
  const [stats, setStats] = useState({ added: 0, removed: 0, unchanged: 0 });

  const [isDragOverOriginal, setIsDragOverOriginal] = useState<boolean>(false);
  const [isDragOverModified, setIsDragOverModified] = useState<boolean>(false);

  const originalFileRef = useRef<HTMLInputElement>(null);
  const modifiedFileRef = useRef<HTMLInputElement>(null);

  // Sync scroll refs for split view
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingLeftScroll = useRef<boolean>(false);
  const isSyncingRightScroll = useRef<boolean>(false);

  const PRESETS = [
    {
      name: 'TS 函数优化对比',
      original: `function calculateTotal(items: CartItem[], discount: number): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    if (item.active) {
      total += item.price * item.quantity;
    }
  }
  if (discount > 0) {
    total = total - (total * discount);
  }
  return total;
}`,
      modified: `function calculateTotal(items: CartItem[], discount: number = 0): number {
  // 使用 reduce 进行函数式优雅求和，并提前进行状态过滤
  const activeTotal = items
    .filter(item => item.active)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 保证折扣比例合规且更稳健的计算扣减
  const discountRate = Math.max(0, Math.min(1, discount));
  return activeTotal * (1 - discountRate);
}`
    },
    {
      name: 'Nginx 伪静态配置变动',
      original: `server {
    listen 80;
    server_name example.com;
    root /var/www/html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
    }
}`,
      modified: `server {
    listen 80;
    listen [::]:80; # 增加 IPv6 监听支持
    server_name example.com www.example.com;
    root /var/www/html/dist; # 重定向至前端编译产物目录

    location / {
        try_files $uri $uri/ /index.html; # SPA 路由支持，直接回退 index.html
    }

    # 关闭不必要的静态资源日志并设置超长缓存
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires max;
        log_not_found off;
        access_log off;
    }
}`
    },
    {
      name: 'JSON 依赖升级比对',
      original: `{
  "name": "developer-toolbox",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.290.0"
  },
  "devDependencies": {
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}`,
      modified: `{
  "name": "developer-toolbox-pro",
  "version": "1.1.0",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.450.0",
    "motion": "^11.11.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^5.2.11"
  }
}`
    }
  ];

  // Set default preset on load
  useEffect(() => {
    setOriginalText(PRESETS[0].original);
    setModifiedText(PRESETS[0].modified);
  }, []);

  // Compute diff when texts or settings change
  useEffect(() => {
    const oldLines = originalText.split(/\r?\n/);
    const newLines = modifiedText.split(/\r?\n/);

    const cleanLine = (line: string) => {
      let result = line;
      if (ignoreWhitespace) {
        result = result.trim().replace(/\s+/g, ' ');
      }
      if (ignoreCase) {
        result = result.toLowerCase();
      }
      return result;
    };

    // Standard LCS dynamic programming table
    const M = oldLines.length;
    const N = newLines.length;
    const dp: number[][] = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(0));

    for (let i = 1; i <= M; i++) {
      for (let j = 1; j <= N; j++) {
        if (cleanLine(oldLines[i - 1]) === cleanLine(newLines[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to assemble unified list
    let i = M;
    let j = N;
    const items: DiffItem[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && cleanLine(oldLines[i - 1]) === cleanLine(newLines[j - 1])) {
        items.unshift({
          type: 'unchanged',
          oldLineNum: i,
          newLineNum: j,
          value: oldLines[i - 1], // show original casing/spacing
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        items.unshift({
          type: 'added',
          newLineNum: j,
          value: newLines[j - 1],
        });
        j--;
      } else {
        items.unshift({
          type: 'removed',
          oldLineNum: i,
          value: oldLines[i - 1],
        });
        i--;
      }
    }

    setDiffResult(items);

    // Build aligned grid rows for split view
    const rows: AlignRow[] = [];
    let idx = 0;
    while (idx < items.length) {
      const current = items[idx];
      if (current.type === 'unchanged') {
        rows.push({
          left: { lineNum: current.oldLineNum, type: 'unchanged', value: current.value },
          right: { lineNum: current.newLineNum, type: 'unchanged', value: current.value }
        });
        idx++;
      } else if (current.type === 'removed') {
        // Look ahead to see if we can align a pairing removed/added
        let nextAddIdx = idx + 1;
        while (nextAddIdx < items.length && items[nextAddIdx].type === 'removed') {
          nextAddIdx++;
        }
        if (nextAddIdx < items.length && items[nextAddIdx].type === 'added') {
          // Match them up!
          rows.push({
            left: { lineNum: current.oldLineNum, type: 'removed', value: current.value },
            right: { lineNum: items[nextAddIdx].newLineNum, type: 'added', value: items[nextAddIdx].value }
          });
          // Remove items from queue
          items.splice(nextAddIdx, 1);
          idx++;
        } else {
          rows.push({
            left: { lineNum: current.oldLineNum, type: 'removed', value: current.value },
            right: null
          });
          idx++;
        }
      } else if (current.type === 'added') {
        rows.push({
          left: null,
          right: { lineNum: current.newLineNum, type: 'added', value: current.value }
        });
        idx++;
      }
    }
    setAlignedRows(rows);

    // Calculate count stats
    let addCount = 0;
    let delCount = 0;
    let keepCount = 0;
    items.forEach((item) => {
      if (item.type === 'added') addCount++;
      else if (item.type === 'removed') delCount++;
      else keepCount++;
    });
    setStats({ added: addCount, removed: delCount, unchanged: keepCount });

  }, [originalText, modifiedText, ignoreWhitespace, ignoreCase]);

  // Synchronize Split View Scrolling
  const handleLeftScroll = () => {
    if (isSyncingRightScroll.current) return;
    isSyncingLeftScroll.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
      rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft;
    }
    setTimeout(() => {
      isSyncingLeftScroll.current = false;
    }, 50);
  };

  const handleRightScroll = () => {
    if (isSyncingLeftScroll.current) return;
    isSyncingRightScroll.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
      leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft;
    }
    setTimeout(() => {
      isSyncingRightScroll.current = false;
    }, 50);
  };

  // Drag and Drop files
  const handleFileDrop = (e: React.DragEvent, side: 'original' | 'modified') => {
    e.preventDefault();
    if (side === 'original') setIsDragOverOriginal(false);
    else setIsDragOverModified(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      readFile(file, side);
    }
  };

  const readFile = (file: File, side: 'original' | 'modified') => {
    onRecordUsage();
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (side === 'original') {
        setOriginalText(text || '');
      } else {
        setModifiedText(text || '');
      }
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, side: 'original' | 'modified') => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file, side);
    }
  };

  const loadPreset = (index: number) => {
    onRecordUsage();
    setOriginalText(PRESETS[index].original);
    setModifiedText(PRESETS[index].modified);
  };

  const swapTexts = () => {
    onRecordUsage();
    const temp = originalText;
    setOriginalText(modifiedText);
    setModifiedText(temp);
  };

  const clearAll = () => {
    onRecordUsage();
    setOriginalText('');
    setModifiedText('');
  };

  return (
    <div id="code-diff-editor-root" className="max-w-7xl mx-auto p-1 animate-fade-in flex flex-col gap-6">
      
      {/* Top Banner & Control Center */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-lg">
            <Icon name="GitCompare" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">代码与文件 Diff 对比器</h3>
            <p className="text-slate-500 text-xs">支持文件拖拽上传、高保真 Git 双栏/单栏比对、精细参数设置。</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400">快速示例:</span>
          {PRESETS.map((preset, i) => (
            <button
              key={preset.name}
              onClick={() => loadPreset(i)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Original File / Left Code */}
        <div 
          className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col gap-3 relative ${
            isDragOverOriginal ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOverOriginal(true); }}
          onDragLeave={() => setIsDragOverOriginal(false)}
          onDrop={(e) => handleFileDrop(e, 'original')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              原始版本 (Original File A)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={originalFileRef}
                onChange={(e) => handleFileSelect(e, 'original')}
                className="hidden"
                accept=".txt,.json,.js,.ts,.tsx,.css,.html,.xml,.yaml,.yml"
              />
              <button
                onClick={() => originalFileRef.current?.click()}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1 transition-all"
              >
                <Icon name="Upload" size={12} />
                上传文件
              </button>
            </div>
          </div>

          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="在此处粘贴原始代码，或者将本地文件拖拽放置到此处..."
            className="w-full h-44 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-hidden focus:ring-1 focus:ring-black resize-y text-slate-800"
          />
        </div>

        {/* Modified File / Right Code */}
        <div 
          className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col gap-3 relative ${
            isDragOverModified ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOverModified(true); }}
          onDragLeave={() => setIsDragOverModified(false)}
          onDrop={(e) => handleFileDrop(e, 'modified')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              修改后版本 (Modified File B)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={modifiedFileRef}
                onChange={(e) => handleFileSelect(e, 'modified')}
                className="hidden"
                accept=".txt,.json,.js,.ts,.tsx,.css,.html,.xml,.yaml,.yml"
              />
              <button
                onClick={() => modifiedFileRef.current?.click()}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1 transition-all"
              >
                <Icon name="Upload" size={12} />
                上传文件
              </button>
            </div>
          </div>

          <textarea
            value={modifiedText}
            onChange={(e) => setModifiedText(e.target.value)}
            placeholder="在此处粘贴修改后的新代码，或者将本地新版本文件拖拽放置到此处..."
            className="w-full h-44 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-hidden focus:ring-1 focus:ring-black resize-y text-slate-800"
          />
        </div>
      </div>

      {/* Control Panel Options & Stat Counters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Comparison Options */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Layout Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setViewMode('split'); onRecordUsage(); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon name="Columns" size={12} />
              双栏分屏 (Split)
            </button>
            <button
              onClick={() => { setViewMode('unified'); onRecordUsage(); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'unified' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon name="Rows" size={12} />
              单栏合并 (Inline)
            </button>
          </div>

          {/* Filtering options */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ignoreWhitespace}
                onChange={(e) => { setIgnoreWhitespace(e.target.checked); onRecordUsage(); }}
                className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
              />
              忽略首尾空格 / 空行
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => { setIgnoreCase(e.target.checked); onRecordUsage(); }}
                className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
              />
              忽略字母大小写
            </label>
          </div>
        </div>

        {/* Global Action buttons & Statistics */}
        <div className="flex items-center gap-4">
          {/* Counters */}
          <div className="flex items-center gap-3 font-mono text-xs font-bold">
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
              +{stats.added} 新增
            </span>
            <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
              -{stats.removed} 删除
            </span>
            <span className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
              ={stats.unchanged} 无变动
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-200" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={swapTexts}
              title="交换 A 和 B 代码位置"
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md cursor-pointer transition-colors"
            >
              <Icon name="RefreshCw" size={14} />
            </button>
            <button
              onClick={clearAll}
              title="清空所有输入"
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-rose-600 border border-slate-200 rounded-md cursor-pointer transition-colors"
            >
              <Icon name="Trash2" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Render Comparison Output Viewer */}
      <div className="bg-slate-900 rounded-xl border border-slate-950 overflow-hidden shadow-md flex flex-col">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-2 font-mono">
            <Icon name="Terminal" size={14} className="text-slate-500" />
            GIT_DIFF_OUTPUT
          </span>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            仅本地渲染
          </span>
        </div>

        {/* Unified/Inline View mode */}
        {viewMode === 'unified' && (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse font-mono text-[11px] leading-relaxed text-slate-300">
              <tbody>
                {diffResult.length === 0 ? (
                  <tr>
                    <td className="p-8 text-center text-slate-600 italic">暂无代码可供对比，请输入内容进行分析。</td>
                  </tr>
                ) : (
                  diffResult.map((item, idx) => {
                    let bgClass = '';
                    let symbol = ' ';
                    let lineNumOldStr = item.oldLineNum ? String(item.oldLineNum) : '';
                    let lineNumNewStr = item.newLineNum ? String(item.newLineNum) : '';

                    if (item.type === 'added') {
                      bgClass = 'bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-500';
                      symbol = '+';
                    } else if (item.type === 'removed') {
                      bgClass = 'bg-rose-950/40 text-rose-300 border-l-4 border-rose-500';
                      symbol = '-';
                    } else {
                      bgClass = 'hover:bg-slate-800/20';
                    }

                    return (
                      <tr key={idx} className={`border-b border-slate-800/10 ${bgClass} transition-colors`}>
                        {/* Old line count */}
                        <td className="w-12 text-right pr-3 select-none text-slate-600 font-bold border-r border-slate-800/40 bg-slate-950/30 py-0.5">
                          {lineNumOldStr}
                        </td>
                        {/* New line count */}
                        <td className="w-12 text-right pr-3 select-none text-slate-600 font-bold border-r border-slate-800/40 bg-slate-950/30 py-0.5">
                          {lineNumNewStr}
                        </td>
                        {/* +/- sign */}
                        <td className="w-6 text-center select-none text-slate-500 font-bold py-0.5">
                          {symbol}
                        </td>
                        {/* Content line */}
                        <td className="pl-4 pr-4 whitespace-pre py-0.5 break-all">
                          {item.value}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Split/Side-by-Side View mode */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-2 divide-x divide-slate-800">
            {/* Left Panel - Original (Removed/Unchanged) */}
            <div 
              ref={leftScrollRef}
              onScroll={handleLeftScroll}
              className="overflow-x-auto max-h-[500px] scrollbar-thin select-text bg-slate-950/10"
            >
              <table className="w-full text-left border-collapse font-mono text-[11px] leading-relaxed text-slate-300">
                <tbody>
                  {alignedRows.length === 0 ? (
                    <tr>
                      <td className="p-8 text-center text-slate-600 italic">等待代码载入...</td>
                    </tr>
                  ) : (
                    alignedRows.map((row, idx) => {
                      const left = row.left;
                      let bgClass = '';
                      let symbol = ' ';
                      let lineStr = '';

                      if (left) {
                        lineStr = left.lineNum ? String(left.lineNum) : '';
                        if (left.type === 'removed') {
                          bgClass = 'bg-rose-950/40 text-rose-300 border-l-4 border-rose-500';
                          symbol = '-';
                        } else {
                          bgClass = 'hover:bg-slate-800/20';
                        }
                      } else {
                        bgClass = 'bg-slate-900/50 opacity-20';
                      }

                      return (
                        <tr key={idx} className={`border-b border-slate-800/5 ${bgClass} transition-colors`}>
                          {/* Line Number */}
                          <td className="w-12 text-right pr-3 select-none text-slate-600 font-bold border-r border-slate-800/40 bg-slate-950/30 py-0.5">
                            {lineStr}
                          </td>
                          {/* Symbol */}
                          <td className="w-6 text-center select-none text-slate-500 font-bold py-0.5">
                            {symbol}
                          </td>
                          {/* Code content */}
                          <td className="pl-4 pr-4 whitespace-pre py-0.5 break-all">
                            {left ? left.value : ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Right Panel - Modified (Added/Unchanged) */}
            <div 
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              className="overflow-x-auto max-h-[500px] scrollbar-thin select-text"
            >
              <table className="w-full text-left border-collapse font-mono text-[11px] leading-relaxed text-slate-300">
                <tbody>
                  {alignedRows.length === 0 ? (
                    <tr>
                      <td className="p-8 text-center text-slate-600 italic">等待代码载入...</td>
                    </tr>
                  ) : (
                    alignedRows.map((row, idx) => {
                      const right = row.right;
                      let bgClass = '';
                      let symbol = ' ';
                      let lineStr = '';

                      if (right) {
                        lineStr = right.lineNum ? String(right.lineNum) : '';
                        if (right.type === 'added') {
                          bgClass = 'bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-500';
                          symbol = '+';
                        } else {
                          bgClass = 'hover:bg-slate-800/20';
                        }
                      } else {
                        bgClass = 'bg-slate-900/50 opacity-20';
                      }

                      return (
                        <tr key={idx} className={`border-b border-slate-800/5 ${bgClass} transition-colors`}>
                          {/* Line Number */}
                          <td className="w-12 text-right pr-3 select-none text-slate-600 font-bold border-r border-slate-800/40 bg-slate-950/30 py-0.5">
                            {lineStr}
                          </td>
                          {/* Symbol */}
                          <td className="w-6 text-center select-none text-slate-500 font-bold py-0.5">
                            {symbol}
                          </td>
                          {/* Code content */}
                          <td className="pl-4 pr-4 whitespace-pre py-0.5 break-all">
                            {right ? right.value : ''}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
