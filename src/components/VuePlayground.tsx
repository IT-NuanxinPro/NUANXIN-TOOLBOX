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

type VueVersion = 'vue3' | 'vue2';
type Tab = 'template' | 'script' | 'style';

// Vue 3 组合式 API 默认示例(setup 函数体)
const DEFAULT_SCRIPT_VUE3 = `const { ref, computed, onMounted } = Vue;

const count = ref(0);
const msg = ref('你好,Vue 3 组合式 API');

const double = computed(() => count.value * 2);

function inc() {
  count.value++;
  console.log('当前计数:', count.value, '双倍:', double.value);
}

onMounted(() => {
  console.log('Vue 3 应用已挂载');
});

// 返回模板需要用到的状态和方法
return { count, msg, double, inc };`;

// Vue 2 Options API 默认示例(对象字面量)
const DEFAULT_SCRIPT_VUE2 = `{
  data() {
    return {
      msg: '你好,Vue 2',
      count: 0
    };
  },
  computed: {
    double() {
      return this.count * 2;
    }
  },
  methods: {
    inc() {
      this.count++;
      console.log('当前计数:', this.count, '双倍:', this.double);
    }
  },
  mounted() {
    console.log('Vue 2 应用已挂载');
  }
}`;

const DEFAULT_TEMPLATE_VUE3 = `<div class="card">
  <h1>{{ msg }} 🌟</h1>
  <p>Vue 3 组合式 API · 计数: {{ count }} · 双倍: {{ double }}</p>
  <button @click="inc">点我 +1</button>
  <div class="count">{{ count }}</div>
</div>`;

const DEFAULT_TEMPLATE_VUE2 = `<div class="card">
  <h1>{{ msg }} 💚</h1>
  <p>Vue 2 Options API · 计数: {{ count }} · 双倍: {{ double }}</p>
  <button @click="inc">点我 +1</button>
  <div class="count">{{ count }}</div>
</div>`;

const DEFAULT_STYLE = `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #42b883, #35495e);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.card {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  text-align: center;
  border: 1px solid rgba(255,255,255,0.18);
}
h1 { margin: 0 0 10px; font-size: 28px; }
p { opacity: 0.85; margin: 0 0 20px; font-size: 13px; }
button {
  background: white;
  color: #35495e;
  border: none;
  padding: 10px 24px;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  transition: transform .2s;
}
button:hover { transform: scale(1.05); }
.count {
  font-size: 36px;
  font-weight: bold;
  margin-top: 16px;
  color: #ffe88a;
}`;

const STORAGE_KEY = 'toolbox_vue_playground_v2';

interface ConsoleEntry {
  id: number;
  type: 'log' | 'error' | 'warn' | 'info';
  text: string;
}

// CDN 地址
const VUE_CDN: Record<VueVersion, string> = {
  vue3: 'https://unpkg.com/vue@3.4.38/dist/vue.global.prod.js',
  vue2: 'https://unpkg.com/vue@2.7.16/dist/vue.js',
};

function getDefaultTemplate(v: VueVersion) {
  return v === 'vue3' ? DEFAULT_TEMPLATE_VUE3 : DEFAULT_TEMPLATE_VUE2;
}

function getDefaultScript(v: VueVersion) {
  return v === 'vue3' ? DEFAULT_SCRIPT_VUE3 : DEFAULT_SCRIPT_VUE2;
}

export const VuePlayground: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [version, setVersion] = useState<VueVersion>('vue3');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE_VUE3);
  const [script, setScript] = useState(DEFAULT_SCRIPT_VUE3);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [activeTab, setActiveTab] = useState<Tab>('template');
  const [autoRun, setAutoRun] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<'console' | 'preview'>('preview');
  const [runKey, setRunKey] = useState(0);

  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const consoleIdRef = useRef(0);

  // 从 localStorage 恢复
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj.version) setVersion(obj.version);
        if (obj.template) setTemplate(obj.template);
        if (obj.script) setScript(obj.script);
        if (obj.style) setStyle(obj.style);
      }
    } catch {}
  }, []);

  // 持久化
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ template, script, style, version }));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [template, script, style, version]);

  const getLanguageExtension = useCallback((tab: Tab) => {
    if (tab === 'template') return htmlLang();
    if (tab === 'style') return cssLang();
    return javascript();
  }, []);

  const getCurrentText = useCallback(() => {
    if (activeTab === 'template') return template;
    if (activeTab === 'style') return style;
    return script;
  }, [activeTab, template, script, style]);

  const setCurrentText = useCallback((v: string) => {
    if (activeTab === 'template') setTemplate(v);
    else if (activeTab === 'style') setStyle(v);
    else setScript(v);
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

  // 组合 srcDoc: 通过 CDN 加载 Vue 运行时并挂载
  // Vue 3: script 是 setup() 函数体(组合式 API),用 new Function 包装
  // Vue 2: script 是 Options 对象,用 new Function 返回该对象
  const srcDoc = useMemo(() => {
    const isVue3 = version === 'vue3';
    // 用 new Function 包装用户代码,避免 eval + 注释剥离的脆弱性
    // 转义反引号和 ${} 避免模板字符串注入
    const escapedScript = script.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

    const mountScript = isVue3
      ? `try {
  var setupFn = new Function('Vue', \`${escapedScript}\`);
  Vue.createApp({
    setup: function() {
      return setupFn(Vue);
    }
  }).mount('#app');
} catch(e) {
  console.error('Vue 3 挂载失败: ' + (e.message || e));
  document.getElementById('app').innerHTML = '<div style=\\'color:#ef4444;padding:20px;font-family:monospace\\'>⚠️ ' + (e.message || e) + '</div>';
}`
      : `try {
  var optsFn = new Function('Vue', \`return (${escapedScript});\`);
  var options = optsFn(Vue) || {};
  options.el = '#app';
  new Vue(options);
} catch(e) {
  console.error('Vue 2 挂载失败: ' + (e.message || e));
  document.getElementById('app').innerHTML = '<div style=\\'color:#ef4444;padding:20px;font-family:monospace\\'>⚠️ ' + (e.message || e) + '</div>';
}`;

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<script src="${VUE_CDN[version]}" crossorigin="anonymous"><\/script>
<style>${style}</style>
</head>
<body>
<div id="app">${template}</div>
<script>
(function() {
  var sendMsg = function(type, args) {
    var text = Array.prototype.map.call(args, function(a) {
      try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
      catch(e) { return String(a); }
    }).join(' ');
    parent.postMessage({ __vuePlayground: true, type: type, text: text }, '*');
  };
  ['log', 'error', 'warn', 'info'].forEach(function(method) {
    var orig = console[method];
    console[method] = function() {
      sendMsg(method, arguments);
      orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function(e) {
    sendMsg('error', [e.message + (e.lineno ? ' (行 ' + e.lineno + ')' : '')]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    sendMsg('error', ['Promise 未捕获: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)]);
  });
})();
<\/script>
<script>
${mountScript}
<\/script>
</body>
</html>`;
  }, [template, script, style, version]);

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
      if (!data || !data.__vuePlayground) return;
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
    setRunKey((k) => k + 1);
    setRenderedDoc(srcDoc);
    setActiveBottomTab('console');
    onRecordUsage();
  };

  // 强制重新挂载 iframe(用于手动运行时)
  const finalDoc = useMemo(() => renderedDoc + `<!-- ${runKey} -->`, [renderedDoc, runKey]);

  const handleReset = () => {
    setTemplate(getDefaultTemplate(version));
    setScript(getDefaultScript(version));
    setStyle(DEFAULT_STYLE);
    setConsoleEntries([]);
    onRecordUsage();
  };

  const handleClearConsole = () => {
    setConsoleEntries([]);
  };

  const handleCopy = () => {
    // Vue 3 组合式 API 导出为 <script setup> 形式更贴近实际使用
    const scriptTag = version === 'vue3'
      ? `<script setup>\n${script}\n</script>`
      : `<script>\nexport default ${script}\n</script>`;
    const full = `<!-- Template -->\n<template>\n${template}\n</template>\n\n${scriptTag}\n\n<!-- Style -->\n<style scoped>\n${style}\n</style>`;
    navigator.clipboard.writeText(full);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    onRecordUsage();
  };

  const handleVersionChange = (v: VueVersion) => {
    if (v === version) return;
    setVersion(v);
    // 切换版本时自动载入对应默认示例,保证可直接运行
    setTemplate(getDefaultTemplate(v));
    setScript(getDefaultScript(v));
    onRecordUsage();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左侧编辑器 */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {/* Vue 版本切换 */}
                <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-slate-100 p-1 rounded-md border border-emerald-100">
                  <button
                    onClick={() => handleVersionChange('vue3')}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                      version === 'vue3' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Vue 3 (组合式)
                  </button>
                  <button
                    onClick={() => handleVersionChange('vue2')}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                      version === 'vue2' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Vue 2 (Options)
                  </button>
                </div>
                {/* 编辑器 Tab */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
                  {(['template', 'script', 'style'] as const).map((t) => (
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
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRun}
                    onChange={(e) => setAutoRun(e.target.checked)}
                    className="h-3 w-3 accent-emerald-600"
                  />
                  自动运行
                </label>
                <button
                  onClick={handleRun}
                  className="flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-md hover:bg-emerald-700 cursor-pointer"
                >
                  <Icon name="Play" size={10} />
                  运行
                </button>
                <button
                  onClick={handleReset}
                  className="text-[10px] font-bold text-slate-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 cursor-pointer"
                  title="重置为当前版本示例"
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
                {isCopied ? '已复制' : '复制 SFC'}
              </button>
            </div>

            {/* 预览 iframe */}
            {activeBottomTab === 'preview' && (
              <iframe
                key={finalDoc}
                srcDoc={renderedDoc}
                title="vue-preview"
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
        {version === 'vue3' ? (
          <>
            <strong>Vue 3 组合式 API:</strong> Script 区域写 <code className="text-emerald-700">setup()</code> 函数体。可直接解构 <code className="text-emerald-700">Vue</code> 全局对象获取 <code className="text-emerald-700">ref / reactive / computed / watch / onMounted</code> 等 API,最后 <code className="text-emerald-700">return</code> 模板需要用到的状态和方法。
          </>
        ) : (
          <>
            <strong>Vue 2 Options API:</strong> Script 区域写 Options 对象字面量,包含 <code className="text-emerald-700">data / methods / computed / mounted</code> 等选项,通过 <code className="text-emerald-700">this</code> 访问实例。
          </>
        )}
        {' '}Template 用 Vue 模板语法,Style 是普通 CSS。通过 CDN 加载 Vue 运行时,代码自动保存到本地。切换版本时会自动载入对应示例。
      </div>
    </div>
  );
};
