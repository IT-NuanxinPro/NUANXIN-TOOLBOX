import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

interface RegexTemplate {
  title: string;
  pattern: string;
  flags: string;
  testText: string;
  description: string;
}

const REGEX_TEMPLATES: RegexTemplate[] = [
  {
    title: '电子邮箱 (Email)',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    flags: 'g',
    testText: 'developer@local.box\ntester_qa@test-company.com.cn\ninvalid.email@com',
    description: '匹配标准的电子邮件格式，支持主流域名。'
  },
  {
    title: '手机号 (中国内地)',
    pattern: '^1[3-9]\\d{9}$',
    flags: 'gm',
    testText: '13812345678\n19999999999\n12345678901 (无效手机号)\n15299887766',
    description: '匹配 11 位中国内地移动电话号码。'
  },
  {
    title: '网页链接 (URL)',
    pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
    flags: 'g',
    testText: '访问网站 https://vite.dev/ 或是 http://localhost:3000/some/path?id=123 进行测试。',
    description: '提取或验证包含 http 或 https 头的网页链接。'
  },
  {
    title: 'IPv4 地址',
    pattern: '((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}',
    flags: 'g',
    testText: '本机环回地址是 127.0.0.1，局域网网关为 192.168.1.1，错误地址 256.100.0.1。',
    description: '提取和检验符合 IPv4 规格的 IP 地址。'
  },
  {
    title: '日期 (YYYY-MM-DD)',
    pattern: '\\d{4}-\\d{2}-\\d{2}',
    flags: 'g',
    testText: '首个交付日期是 2026-07-08，而截止日期为 2026-12-31，错误格式 2026/07/08。',
    description: '匹配标准的横杠分隔日期（不校验闰年/大月具体逻辑）。'
  },
  {
    title: '纯中文汉字',
    pattern: '[\\u4e00-\\u9fa5]+',
    flags: 'g',
    testText: '你好 World! 这是一个 Local-First 工具箱。',
    description: '匹配 Unicode 中的中文字符。'
  }
];

export const RegexTester: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [pattern, setPattern] = useState<string>('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
  const [flags, setFlags] = useState<{ g: boolean; i: boolean; m: boolean }>({ g: true, i: false, m: false });
  const [testText, setTestText] = useState<string>('developer@local.box\ntester_qa@test-company.com.cn\ninvalid.email@com');
  const [regexError, setRegexError] = useState<string | null>(null);
  const [matches, setMatches] = useState<RegExpMatchArray[]>([]);
  const [highlightedElement, setHighlightedElement] = useState<React.ReactNode[]>([]);

  const handleTemplateClick = (tpl: RegexTemplate) => {
    setPattern(tpl.pattern);
    setFlags({
      g: tpl.flags.includes('g'),
      i: tpl.flags.includes('i'),
      m: tpl.flags.includes('m'),
    });
    setTestText(tpl.testText);
    onRecordUsage();
  };

  const getFlagString = () => {
    let f = '';
    if (flags.g) f += 'g';
    if (flags.i) f += 'i';
    if (flags.m) f += 'm';
    return f;
  };

  useEffect(() => {
    if (!pattern) {
      setMatches([]);
      setRegexError(null);
      setHighlightedElement([testText]);
      return;
    }

    try {
      const activeFlags = getFlagString();
      const re = new RegExp(pattern, activeFlags);
      setRegexError(null);

      // Perform matches
      const localMatches: RegExpMatchArray[] = [];
      if (activeFlags.includes('g')) {
        let match;
        re.lastIndex = 0;
        let infiniteLoopGuard = 0;
        while ((match = re.exec(testText)) !== null) {
          localMatches.push(match);
          if (match[0].length === 0) {
            re.lastIndex++;
          }
          infiniteLoopGuard++;
          if (infiniteLoopGuard > 1000) break;
        }
      } else {
        const singleMatch = testText.match(re);
        if (singleMatch) {
          localMatches.push(singleMatch);
        }
      }
      setMatches(localMatches);

      // Generate visual match highlighting
      if (localMatches.length === 0) {
        setHighlightedElement([testText]);
        return;
      }

      const visualSpans: React.ReactNode[] = [];
      let cursor = 0;
      
      const gRe = new RegExp(pattern, activeFlags.includes('g') ? activeFlags : activeFlags + 'g');
      gRe.lastIndex = 0;
      
      let match;
      let count = 0;
      let infiniteLoopGuard = 0;
      
      while ((match = gRe.exec(testText)) !== null) {
        const matchIdx = match.index;
        const matchStr = match[0];
        
        if (matchIdx > cursor) {
          visualSpans.push(testText.slice(cursor, matchIdx));
        }
        
        visualSpans.push(
          <mark 
            key={`m-${count}`} 
            className="bg-yellow-200 text-yellow-900 px-1 py-0.5 rounded-sm border-b border-yellow-400 font-bold font-mono text-xs shadow-2xs"
            title={`匹配 #${count + 1}`}
          >
            {matchStr}
          </mark>
        );
        
        cursor = gRe.lastIndex;
        if (matchStr.length === 0) {
          gRe.lastIndex++;
          cursor = gRe.lastIndex;
        }
        count++;
        infiniteLoopGuard++;
        if (infiniteLoopGuard > 1000) break;
      }
      
      if (cursor < testText.length) {
        visualSpans.push(testText.slice(cursor));
      }
      
      setHighlightedElement(visualSpans);

    } catch (err: any) {
      setRegexError(err.message);
      setMatches([]);
      setHighlightedElement([testText]);
    }
  }, [pattern, flags.g, flags.i, flags.m, testText]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Templates List Side (Left) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Icon name="BookOpen" className="text-slate-900" size={16} />
            常用正则表达式模板
          </h4>

          <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {REGEX_TEMPLATES.map((tpl) => (
              <button
                key={tpl.title}
                type="button"
                onClick={() => handleTemplateClick(tpl)}
                className="w-full text-left p-3 rounded-md border border-slate-100 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer flex flex-col gap-1"
              >
                <span className="text-xs font-bold text-slate-800">{tpl.title}</span>
                <span className="font-mono text-[10px] text-slate-400 truncate bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">{tpl.pattern}</span>
                <p className="text-[10px] text-slate-500 leading-normal font-semibold">{tpl.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Regex Config & Test Field (Right) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
          
          {/* Formulator */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">正则表达式 (Regex Pattern)</label>
              <div className="flex items-center gap-1.5 bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 focus-within:ring-1 focus-within:ring-black">
                <span className="text-sm font-semibold text-slate-500 font-mono select-none">/</span>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="[a-z]+"
                  className="w-full text-xs bg-transparent border-0 outline-hidden font-mono text-emerald-400 p-0 focus:ring-0"
                />
                <span className="text-sm font-semibold text-slate-500 font-mono select-none">/</span>
                <span className="text-xs font-mono text-slate-400 font-semibold select-none">{getFlagString()}</span>
              </div>
            </div>

            {/* Checkbox flags */}
            <div className="flex flex-wrap gap-4 items-center bg-slate-50 p-3 rounded-md border border-slate-200 text-xs">
              <span className="font-bold text-slate-500">匹配修饰符 (Flags):</span>
              
              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={flags.g}
                  onChange={(e) => setFlags({ ...flags, g: e.target.checked })}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                />
                全局搜索 (g)
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={flags.i}
                  onChange={(e) => setFlags({ ...flags, i: e.target.checked })}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                />
                忽略大小写 (i)
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={flags.m}
                  onChange={(e) => setFlags({ ...flags, m: e.target.checked })}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                />
                多行匹配 (m)
              </label>

            </div>

            {regexError && (
              <div className="text-xs text-red-600 bg-red-50 rounded-md p-2.5 border border-red-100 flex items-center gap-2">
                <Icon name="AlertTriangle" className="shrink-0 text-red-500" size={14} />
                <span>正则表达式有语法错误: {regexError}</span>
              </div>
            )}
          </div>

          {/* Test Text input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">测试文本内容 (Test Subject)</label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="在此输入需要用于测试匹配的测试文本段落..."
              rows={4}
              className="w-full text-xs bg-slate-50 border border-slate-200 p-3 rounded-xl outline-hidden focus:ring-1 focus:ring-black resize-none font-mono text-slate-700 leading-normal"
            />
          </div>

          {/* Highlight and Analysis results */}
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>高亮测试结果：</span>
              <span>匹配到 <strong className="text-slate-900 font-bold">{matches.length}</strong> 处</span>
            </div>

            {/* Simulated terminal with markers */}
            <div className="w-full p-4 bg-slate-950 text-slate-300 font-mono text-xs rounded-xl border border-slate-800 min-h-[120px] whitespace-pre-wrap break-all leading-relaxed">
              {highlightedElement}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
