import React, { useState } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

export const TextEditor: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [text, setText] = useState<string>(
    `# 欢迎使用 Markdown 高级文本编辑器 🚀\n\n这是一个极其方便且实用的文本百宝箱工具。您可以在左侧面板中实时编辑内容，右侧面板将即时同步并排版渲染。\n\n## 常用功能特点\n- **文本转换**：支持一键大写、小写、按行去重及按行排序\n- **JSON 转换**：支持快速进行 JSON 转义与反转义，解决开发中的转义字符头疼问题\n- **轻量即时**：所有计算与渲染均在客户端即时完成，体验丝滑流畅\n\n> 真正出色的设计往往来源于纯粹的对负空间与字体间距的控制 —— 暖心设计理念`
  );
  const [activeTab, setActiveTab] = useState<'raw' | 'markdown'>('markdown');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Compute text telemetry stats
  const lineCount = text === '' ? 0 : text.split('\n').length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const charCount = text.length;

  // Actions
  const handleUppercase = () => {
    setText((prev) => prev.toUpperCase());
    onRecordUsage();
  };

  const handleLowercase = () => {
    setText((prev) => prev.toLowerCase());
    onRecordUsage();
  };

  const handleLineSort = () => {
    const sorted = text.split('\n').sort().join('\n');
    setText(sorted);
    onRecordUsage();
  };

  const handleLineDeduplicate = () => {
    const lines = text.split('\n');
    const unique = Array.from(new Set(lines)).join('\n');
    setText(unique);
    onRecordUsage();
  };

  const handleFilterEmptyLines = () => {
    const filtered = text
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n');
    setText(filtered);
    onRecordUsage();
  };

  const handleEscapeJson = () => {
    try {
      const escaped = JSON.stringify(text);
      // Remove outer quotes
      setText(escaped.slice(1, -1));
      onRecordUsage();
    } catch {
      // Keep state intact
    }
  };

  const handleUnescapeJson = () => {
    try {
      // Add wrapping quotes to try parser
      const unescaped = JSON.parse('"' + text.replace(/"/g, '\\"') + '"');
      setText(unescaped);
      onRecordUsage();
    } catch {
      // Fallback manual replacement
      const unescaped = text
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      setText(unescaped);
      onRecordUsage();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    onRecordUsage();
  };

  const handleClear = () => {
    setText('');
    onRecordUsage();
  };

  // Quick HTML-Markdown direct parser
  const renderMarkdownToHtml = (mdStr: string) => {
    const escaped = mdStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lines = escaped.split('\n');
    const result: React.ReactNode[] = [];
    let insideCodeBlock = false;
    let codeContent: string[] = [];

    lines.forEach((line, idx) => {
      // Code Block Detection
      if (line.trim().startsWith('```')) {
        if (insideCodeBlock) {
          // close block
          insideCodeBlock = false;
          result.push(
            <pre key={`code-${idx}`} className="bg-slate-900 text-emerald-400 p-3.5 rounded-md font-mono text-xs overflow-x-auto my-3 border border-slate-800">
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
        } else {
          // open block
          insideCodeBlock = true;
        }
        return;
      }

      if (insideCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith('# ')) {
        result.push(
          <h1 key={idx} className="text-xl font-extrabold text-slate-900 mt-5 mb-2.5 border-b border-slate-100 pb-1.5 leading-tight">
            {parseInlineStyles(line.slice(2))}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        result.push(
          <h2 key={idx} className="text-base font-extrabold text-slate-900 mt-4 mb-2 leading-tight">
            {parseInlineStyles(line.slice(3))}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        result.push(
          <h3 key={idx} className="text-sm font-bold text-slate-800 mt-3 mb-1.5 leading-tight">
            {parseInlineStyles(line.slice(4))}
          </h3>
        );
        return;
      }

      // Blockquotes
      if (line.startsWith('&gt; ') || line.startsWith('> ')) {
        const cleanQuote = line.startsWith('&gt; ') ? line.slice(5) : line.slice(2);
        result.push(
          <blockquote key={idx} className="border-l-4 border-slate-900 bg-slate-50 pl-3.5 py-1.5 my-3 text-slate-600 italic text-xs font-semibold">
            {parseInlineStyles(cleanQuote)}
          </blockquote>
        );
        return;
      }

      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        result.push(
          <li key={idx} className="list-disc ml-5 text-xs text-slate-700 my-1 leading-relaxed">
            {parseInlineStyles(line.trim().slice(2))}
          </li>
        );
        return;
      }

      // Empty Lines
      if (line.trim() === '') {
        result.push(<div key={idx} className="h-2" />);
        return;
      }

      // Regular Paragraphs
      result.push(
        <p key={idx} className="text-xs text-slate-700 leading-relaxed my-2">
          {parseInlineStyles(line)}
        </p>
      );
    });

    return result;
  };

  // Helper to parse bold, italics, inline code, and symbols
  const parseInlineStyles = (txt: string): React.ReactNode => {
    // 1. Double asterisks for bold
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    const regex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = regex.exec(txt)) !== null) {
      const matchIdx = match.index;
      if (matchIdx > cursor) {
        parts.push(txt.slice(cursor, matchIdx));
      }
      parts.push(
        <strong key={`bold-${matchIdx}`} className="font-extrabold text-slate-950">
          {match[1]}
        </strong>
      );
      cursor = regex.lastIndex;
    }

    if (cursor < txt.length) {
      parts.push(txt.slice(cursor));
    }

    // Wrap single element back if empty styles matched
    return parts.length > 0 ? <>{parts}</> : txt;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      
      {/* Editor Side (Left) */}
      <div className="lg:col-span-6 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col h-full gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Icon name="FileText" size={16} />
              高级文本编辑区
            </h4>
            <div className="flex gap-1.5">
              <button
                onClick={handleCopy}
                className="text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-2.5 py-1 rounded-md transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={11} />
                {isCopied ? '已复制' : '复制全文'}
              </button>
              <button
                onClick={handleClear}
                className="text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-red-600 px-2.5 py-1 rounded-md transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Icon name="Trash2" size={11} />
                清空
              </button>
            </div>
          </div>

          {/* Quick Transform Actions Row */}
          <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2.5 rounded-md border border-slate-200">
            <button
              onClick={handleUppercase}
              className="text-[10px] font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
            >
              转换为大写
            </button>
            <button
              onClick={handleLowercase}
              className="text-[10px] font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
            >
              转换为小写
            </button>
            <button
              onClick={handleLineSort}
              className="text-[10px] font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
            >
              按行字母排序
            </button>
            <button
              onClick={handleLineDeduplicate}
              className="text-[10px] font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
            >
              去重重复行
            </button>
            <button
              onClick={handleFilterEmptyLines}
              className="text-[10px] font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
            >
              过滤空白行
            </button>
            <div className="h-4 w-[1px] bg-slate-300 self-center mx-1" />
            <button
              onClick={handleEscapeJson}
              title="转义为 JSON 字符串"
              className="text-[10px] font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
            >
              JSON 转义
            </button>
            <button
              onClick={handleUnescapeJson}
              title="反转义 JSON 还原"
              className="text-[10px] font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 cursor-pointer shadow-2xs"
            >
              JSON 反转义
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="在这里开始写东西、粘贴日志、测试去重或起草 Markdown..."
            className="flex-1 w-full min-h-[300px] text-xs font-mono bg-slate-50 border border-slate-200 p-3.5 rounded-md outline-hidden focus:ring-1 focus:ring-slate-950 leading-relaxed text-slate-800"
          />

          {/* Telemetry panel */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold bg-slate-50 py-2 border border-slate-200 rounded-md">
            <div>
              <span className="text-slate-400 block font-semibold">总字数</span>
              <span className="text-slate-800 font-mono text-xs">{wordCount}</span>
            </div>
            <div className="border-x border-slate-200">
              <span className="text-slate-400 block font-semibold">字符数</span>
              <span className="text-slate-800 font-mono text-xs">{charCount}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">物理行数</span>
              <span className="text-slate-800 font-mono text-xs">{lineCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Side (Right) */}
      <div className="lg:col-span-6 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col h-full gap-4">
          
          {/* Tab Switcher */}
          <div className="flex border border-slate-200 bg-slate-100 p-1 rounded-md gap-1">
            <button
              onClick={() => setActiveTab('markdown')}
              className={`flex-1 text-center text-xs font-bold py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'markdown'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Markdown 排版预览
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`flex-1 text-center text-xs font-bold py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              无格式纯文本
            </button>
          </div>

          {/* Display screen */}
          <div className="flex-1 min-h-[360px] p-4 rounded-md border border-slate-100 overflow-y-auto max-h-[460px]">
            {activeTab === 'raw' ? (
              <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap break-all leading-relaxed">
                {text || <span className="text-slate-300 italic font-sans font-semibold">当前没有输入任何文本。</span>}
              </pre>
            ) : (
              <div className="prose prose-slate max-w-none">
                {text.trim() ? (
                  renderMarkdownToHtml(text)
                ) : (
                  <div className="text-slate-300 italic text-xs font-semibold">
                    当前输入为空，无法进行排版预览。
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
