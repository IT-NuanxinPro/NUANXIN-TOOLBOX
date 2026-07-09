import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { css as cssLang } from '@codemirror/lang-css';
import { html as htmlLang } from '@codemirror/lang-html';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentUnit } from '@codemirror/language';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

const DEFAULT_HTML = `<div class="card">
  <h1>你好,世界 🌍</h1>
  <p>这是一个本地实时预览的代码场</p>
  <button id="btn">点我计数</button>
  <div id="count">0</div>
</div>`;

const DEFAULT_CSS = `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #667eea, #764ba2);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.card {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  text-align: center;
  border: 1px solid rgba(255,255,255,0.2);
}
h1 { margin: 0 0 10px; font-size: 28px; }
p { opacity: 0.8; margin: 0 0 20px; }
button {
  background: white;
  color: #764ba2;
  border: none;
  padding: 10px 24px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  transition: transform .2s;
}
button:hover { transform: scale(1.05); }
#count {
  font-size: 36px;
  font-weight: bold;
  margin-top: 16px;
}`;

const DEFAULT_JS = `console.log('Hello from 代码场!');
const btn = document.getElementById('btn');
const countEl = document.getElementById('count');
let n = 0;
btn.addEventListener('click', () => {
  n++;
  countEl.textContent = n;
  console.log('当前计数:', n);
});`;

const STORAGE_KEY = 'toolbox_code_playground_v2';

type Tab = 'html' | 'css' | 'js';

interface ConsoleEntry {
  id: number;
  type: 'log' | 'error' | 'warn' | 'info';
  text: string;
}

export const CodePlayground: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [js, setJs] = useState(DEFAULT_JS);
  const [activeTab, setActiveTab] = useState<Tab>('html');
  const [autoRun, setAutoRun] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'preview'>('preview');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const consoleIdRef = useRef(0);

  // 从 localStorage 恢复
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj.html) setHtml(obj.html);
        if (obj.css) setCss(obj.css);
        if (obj.js) setJs(obj.js);
      }
    } catch {}
  }, []);

  // 持久化
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ html, css, js }));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [html, css, js]);

  // 获取当前语言的扩展
  const getLanguageExtension = useCallback((tab: Tab) => {
    if (tab === 'html') return htmlLang();
    if (tab === 'css') return cssLang();
    return javascript();
  }, []);

  // 当前文本
  const getCurrentText = useCallback(() => {
    if (activeTab === 'html') return html;
    if (activeTab === 'css') return css;
    return js;
  }, [activeTab, html, css, js]);

  const setCurrentText = useCallback((v: string) => {
    if (activeTab === 'html') setHtml(v);
    else if (activeTab === 'css') setCss(v);
    else setJs(v);
  }, [activeTab]);

  // 初始化 / 切换 tab 时重建 CodeMirror 实例
  useEffect(() => {
    if (!editorHostRef.current) return;

    const updateListener = EditorView.updateListener.of((vu) => {
      if (vu.docChanged) {
        const newText = vu.state.doc.toString();
        setCurrentText(newText);
      }
    });

    const state = EditorState.create({
      doc: getCurrentText(),
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
        indentUnit.of('  '),
        getLanguageExtension(activeTab),
        autocompletion(),
        oneDark,
        EditorView.lineWrapping,
        updateListener,
        EditorView.theme({
          '&': { fontSize: '12px', height: '100%' },
          '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
          '.cm-content': { padding: '12px 0' },
          '.cm-gutters': { background: '#0f172a', border: 'none' },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorHostRef.current,
    });
    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [activeTab]);

  // 组合 srcDoc(注入 console 拦截脚本)
  const srcDoc = useMemo(() => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>${css}</style>
</head>
<body>
${html}
<script>
(function() {
  var sendMsg = function(type, args) {
    var text = Array.prototype.map.call(args, function(a) {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
      catch(e) { return String(a); }
    }).join(' ');
    parent.postMessage({ __codePlayground: true, type: type, text: text }, '*');
  };
  ['log', 'error', 'warn', 'info'].forEach(function(method) {
    var orig = console[method];
    console[method] = function() {
      sendMsg(method, arguments);
      orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function(e) {
    sendMsg('error', [e.message + ' (行 ' + e.lineno + ')']);
  });
})();
</script>
<script>
try {
${js}
} catch(e) {
  console.error(e.message);
}
</script>
</body>
</html>`, [html, css, js]);

  const [renderedDoc, setRenderedDoc] = useState(srcDoc);
  useEffect(() => {
    if (!autoRun) return;
    const t = setTimeout(() => {
      setRenderedDoc(srcDoc);
      setConsoleEntries([]);
    }, 600);
    return () => clearTimeout(t);
  }, [srcDoc, autoRun]);

  // 监听 iframe 的 console 消息
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data;
      if (!data || !data.__codePlayground) return;
      setConsoleEntries((prev) => [
        ...prev,
        { id: consoleIdRef.current++, type: data.type, text: data.text },
      ]);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleRun = () => {
    setConsoleEntries([]);
    setRenderedDoc(srcDoc);
    setActiveBottomTab('console');
    onRecordUsage();
  };

  const handleReset = () => {
    setHtml(DEFAULT_HTML);
    setCss(DEFAULT_CSS);
    setJs(DEFAULT_JS);
    setConsoleEntries([]);
    onRecordUsage();
  };

  const handleClearConsole = () => {
    setConsoleEntries([]);
  };

  const handleCopy = () => {
    const full = `<!-- HTML -->\n${html}\n\n<!-- CSS -->\n<style>\n${css}\n</style>\n\n<!-- JS -->\n<script>\n${js}\n</script>`;
    navigator.clipboard.writeText(full);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    onRecordUsage();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左侧编辑器 */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
                {(['html', 'css', 'js'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`text-[11px] font-bold px-3 py-1 rounded transition-all cursor-pointer uppercase ${
                      activeTab === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRun}
                    onChange={(e) => setAutoRun(e.target.checked)}
                    className="h-3 w-3 accent-slate-900"
                  />
                  自动运行
                </label>
                <button
                  onClick={handleRun}
                  className="flex items-center gap-1 text-[10px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-md hover:bg-slate-950 cursor-pointer"
                >
                  <Icon name="Play" size={10} />
                  运行
                </button>
                <button
                  onClick={handleReset}
                  className="text-[10px] font-bold text-slate-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 cursor-pointer"
                  title="重置为示例"
                >
                  <Icon name="RotateCcw" size={11} />
                </button>
              </div>
            </div>
            <div ref={editorHostRef} className="h-[460px] overflow-hidden bg-slate-950" />
          </div>
        </div>

        {/* 右侧预览 + 终端 */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
                <button
                  onClick={() => setActiveBottomTab('preview')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <Icon name="Eye" size={10} /> 预览
                </button>
                <button
                  onClick={() => setActiveBottomTab('console')}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                    activeBottomTab === 'console' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <Icon name="Terminal" size={10} /> 控制台
                  {consoleEntries.length > 0 && (
                    <span className="ml-1 bg-slate-900 text-white text-[9px] px-1.5 rounded-full">
                      {consoleEntries.length}
                    </span>
                  )}
                </button>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 font-bold text-[10px] py-1 px-2.5 rounded-md border transition-all cursor-pointer ${
                  isCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={10} />
                {isCopied ? '已复制' : '复制全部'}
              </button>
            </div>

            {/* 预览 iframe */}
            {activeBottomTab === 'preview' && (
              <iframe
                ref={iframeRef}
                srcDoc={renderedDoc}
                title="preview"
                sandbox="allow-scripts allow-modals allow-forms"
                className="w-full h-[460px] bg-white border-0"
              />
            )}

            {/* 控制台 */}
            {activeBottomTab === 'console' && (
              <div className="flex flex-col h-[460px]">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">CONSOLE</span>
                  <button
                    onClick={handleClearConsole}
                    className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer flex items-center gap-1"
                  >
                    <Icon name="Trash2" size={10} />
                    清空
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-slate-950 p-3 font-mono text-[11px] leading-relaxed">
                  {consoleEntries.length === 0 ? (
                    <div className="text-slate-600 italic flex items-center gap-2 mt-2">
                      <Icon name="ChevronRight" size={12} />
                      控制台暂无输出。运行代码后,console.log/error/warn 会显示在这里。
                    </div>
                  ) : (
                    consoleEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`py-1 border-b border-slate-900/50 flex items-start gap-2 ${
                          entry.type === 'error'
                            ? 'text-red-400'
                            : entry.type === 'warn'
                            ? 'text-amber-400'
                            : entry.type === 'info'
                            ? 'text-sky-400'
                            : 'text-slate-200'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase mt-0.5 opacity-60 shrink-0">
                          {entry.type === 'log' ? '›' : entry.type === 'error' ? '✗' : entry.type === 'warn' ? '!' : 'i'}
                        </span>
                        <pre className="whitespace-pre-wrap break-all flex-1">{entry.text}</pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-md border border-slate-200 leading-relaxed">
        <strong>使用说明:</strong> 编辑器支持语法高亮、代码补全(Ctrl+Space)、自动缩进。代码自动保存到浏览器本地。控制台捕获 iframe 中的 console.log/error/warn 输出。
      </div>
    </div>
  );
};
