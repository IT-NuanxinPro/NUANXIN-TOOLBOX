import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TOOL_REGISTRY, CATEGORIES } from './registry';
import { SVGConverter } from './components/SVGConverter';
import { JsonYaml } from './components/JsonYaml';
import { Base64Codec } from './components/Base64Codec';
import { TimestampHelper } from './components/TimestampHelper';
import { UuidGenerator } from './components/UuidGenerator';
import { RegexTester } from './components/RegexTester';
import { OpsConfigs } from './components/OpsConfigs';
import { HashCrypto } from './components/HashCrypto';
import { TextEditor } from './components/TextEditor';
import { ColorBox } from './components/ColorBox';
import { QrCodeGenerator } from './components/QrCodeGenerator';
import { RsaGenerator } from './components/RsaGenerator';
import { AesCrypto } from './components/AesCrypto';
import { JwtDebugger } from './components/JwtDebugger';
import { UrlCodec } from './components/UrlCodec';
import { CronParser } from './components/CronParser';
import { JsonDiff } from './components/JsonDiff';
import { RandomPassword } from './components/RandomPassword';
import { SubnetCalculator } from './components/SubnetCalculator';
import { UserAgentParser } from './components/UserAgentParser';
import { PlaceholderGenerator } from './components/PlaceholderGenerator';
import { CodeDiffEditor } from './components/CodeDiffEditor';
import { LinuxCommandHelper } from './components/LinuxCommandHelper';
import { HttpStatusHelper } from './components/HttpStatusHelper';
import { Icon } from './components/Icon';
import { ToolCategory, UserRole } from './types';

export default function App() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('toolbox_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('toolbox_recents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [usageStats, setUsageStats] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('toolbox_usage_stats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeToolId, setActiveToolId] = useState<string | null>('svg-converter');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeRole, setActiveRole] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const mainRef = useRef<HTMLElement>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});

  // Change activeToolId while safely preserving the precise scroll position BEFORE state updates and DOM mutations
  const changeActiveToolId = (newId: string | null) => {
    const mainElement = mainRef.current;
    if (mainElement) {
      const currentKey = activeToolId || 'lobby';
      scrollPositionsRef.current[currentKey] = mainElement.scrollTop;
    }
    setActiveToolId(newId);
  };

  // LayoutEffect to restore scroll positions when activeToolId changes
  useLayoutEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const key = activeToolId || 'lobby';
    const savedPosition = scrollPositionsRef.current[key] || 0;
    mainElement.scrollTop = savedPosition;
  }, [activeToolId]);

  // Sync favorites
  useEffect(() => {
    localStorage.setItem('toolbox_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Sync recents
  useEffect(() => {
    localStorage.setItem('toolbox_recents', JSON.stringify(recents));
  }, [recents]);

  // Sync usage stats
  useEffect(() => {
    localStorage.setItem('toolbox_usage_stats', JSON.stringify(usageStats));
  }, [usageStats]);

  // Handle Recording of Tool Usage
  const handleRecordUsage = (idStr?: string) => {
    const targetId = idStr || activeToolId;
    if (!targetId) return;

    // 1. Add to recents (bringing to front, keeping unique, max 5)
    setRecents((prev) => {
      const updated = [targetId, ...prev.filter((id) => id !== targetId)];
      return updated.slice(0, 5);
    });

    // 2. Increment stats count
    setUsageStats((prev) => ({
      ...prev,
      [targetId]: (prev[targetId] || 0) + 1,
    }));
  };

  // Star / Favorite toggle
  const toggleFavorite = (idStr: string) => {
    setFavorites((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  };

  // Launch tool from clicking
  const launchTool = (idStr: string) => {
    changeActiveToolId(idStr);
    handleRecordUsage(idStr);
  };

  // Filter list of tools based on Query and Category
  const filteredTools = TOOL_REGISTRY.filter((tool) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // Map Category IDs to Names
  const getCategoryName = (catId: ToolCategory) => {
    const found = CATEGORIES.find((c) => c.id === catId);
    return found ? found.name : catId;
  };

  // Current active tool item
  const activeToolItem = TOOL_REGISTRY.find((t) => t.id === activeToolId);

  // Render proper tool screen
  const renderToolScreen = () => {
    if (!activeToolId) return null;
    
    switch (activeToolId) {
      case 'svg-converter':
        return <SVGConverter onRecordUsage={() => handleRecordUsage('svg-converter')} />;
      case 'json-yaml':
        return <JsonYaml onRecordUsage={() => handleRecordUsage('json-yaml')} />;
      case 'base64':
        return <Base64Codec onRecordUsage={() => handleRecordUsage('base64')} />;
      case 'timestamp':
        return <TimestampHelper onRecordUsage={() => handleRecordUsage('timestamp')} />;
      case 'uuid-gen':
        return <UuidGenerator onRecordUsage={() => handleRecordUsage('uuid-gen')} />;
      case 'regex':
        return <RegexTester onRecordUsage={() => handleRecordUsage('regex')} />;
      case 'ops-configs':
        return <OpsConfigs onRecordUsage={() => handleRecordUsage('ops-configs')} />;
      case 'hash-crypto':
        return <HashCrypto onRecordUsage={() => handleRecordUsage('hash-crypto')} />;
      case 'text-editor':
        return <TextEditor onRecordUsage={() => handleRecordUsage('text-editor')} />;
      case 'color-box':
        return <ColorBox onRecordUsage={() => handleRecordUsage('color-box')} />;
      case 'qrcode-gen':
        return <QrCodeGenerator onRecordUsage={() => handleRecordUsage('qrcode-gen')} />;
      case 'rsa-generator':
        return <RsaGenerator onRecordUsage={() => handleRecordUsage('rsa-generator')} />;
      case 'aes-crypto':
        return <AesCrypto onRecordUsage={() => handleRecordUsage('aes-crypto')} />;
      case 'jwt-debugger':
        return <JwtDebugger onRecordUsage={() => handleRecordUsage('jwt-debugger')} />;
      case 'url-codec':
        return <UrlCodec onRecordUsage={() => handleRecordUsage('url-codec')} />;
      case 'cron-parser':
        return <CronParser onRecordUsage={() => handleRecordUsage('cron-parser')} />;
      case 'json-diff':
        return <JsonDiff onRecordUsage={() => handleRecordUsage('json-diff')} />;
      case 'random-password':
        return <RandomPassword onRecordUsage={() => handleRecordUsage('random-password')} />;
      case 'subnet-calculator':
        return <SubnetCalculator onRecordUsage={() => handleRecordUsage('subnet-calculator')} />;
      case 'user-agent':
        return <UserAgentParser onRecordUsage={() => handleRecordUsage('user-agent')} />;
      case 'image-placeholder':
        return <PlaceholderGenerator onRecordUsage={() => handleRecordUsage('image-placeholder')} />;
      case 'code-diff':
        return <CodeDiffEditor onRecordUsage={() => handleRecordUsage('code-diff')} />;
      case 'linux-cmd-helper':
        return <LinuxCommandHelper onRecordUsage={() => handleRecordUsage('linux-cmd-helper')} />;
      case 'http-status-helper':
        return <HttpStatusHelper onRecordUsage={() => handleRecordUsage('http-status-helper')} />;
      default:
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            该小工具正在紧急研发中，敬请期待！
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col font-sans text-slate-900 selection:bg-slate-200 antialiased overflow-hidden">
      
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {sidebarOpen ? (
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:text-slate-900 rounded-md transition-all cursor-pointer font-bold"
              title="收起侧边栏"
              id="btn-collapse-sidebar"
            >
              <Icon name="PanelLeftClose" size={13} />
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 hover:text-indigo-700 rounded-md transition-all cursor-pointer font-bold"
              title="展开侧边栏"
              id="btn-expand-sidebar"
            >
              <Icon name="PanelLeftOpen" size={13} />
            </button>
          )}
          
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => changeActiveToolId(null)}>
            <img src="/logo.svg" className="h-8 w-8 rounded-lg shrink-0 object-contain shadow-xs border border-slate-200/40" alt="暖心工作箱 Logo" referrerPolicy="no-referrer" />
            <div>
              <h1 className="font-extrabold text-slate-900 text-sm tracking-tight leading-none flex items-center gap-1.5">
                暖心工作箱
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1">简约高效的开发辅助百宝箱</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeToolId && (
            <button
              onClick={() => changeActiveToolId(null)}
              className="text-xs bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
            >
              <Icon name="FileText" size={12} />
              返回工具大厅
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex items-stretch overflow-hidden">
        
        {/* Left Sidebar Panel */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden"
            >
              <div className="w-64 h-full flex flex-col shrink-0">
                {/* Search filter */}
                <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                    <Icon name="Search" className="text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="搜索开发工具..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs bg-transparent border-0 outline-hidden p-0 focus:ring-0 text-slate-800 placeholder-slate-400 font-semibold"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                        <Icon name="Trash2" size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrolling Sidebar Sections */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
                  
                  {/* Category Tree */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1.5">工具分类</span>
                    <nav className="flex flex-col gap-0.5">
                      {CATEGORIES.map((cat) => {
                        const count = cat.id === 'all' 
                          ? TOOL_REGISTRY.length 
                          : TOOL_REGISTRY.filter((t) => t.category === cat.id).length;

                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setActiveCategory(cat.id);
                              if (activeToolId) changeActiveToolId(null);
                            }}
                            className={`text-left text-xs px-3 py-2 rounded-md font-bold flex items-center justify-between transition-colors cursor-pointer ${
                              activeCategory === cat.id
                                ? 'bg-slate-900 text-white font-extrabold'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <span className="truncate">{cat.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              activeCategory === cat.id ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* My starred favorites */}
                  {favorites.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1.5 flex items-center gap-1">
                        <Icon name="Star" className="text-slate-900 fill-slate-900" size={10} />
                        常用收藏
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {favorites.map((favId) => {
                          const item = TOOL_REGISTRY.find((t) => t.id === favId);
                          if (!item) return null;
                          return (
                            <button
                              key={favId}
                              onClick={() => launchTool(favId)}
                              className={`text-left text-xs px-3 py-1.5 rounded-md font-bold truncate transition-colors cursor-pointer flex items-center justify-between ${
                                activeToolId === favId
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <span className="truncate">{item.title}</span>
                              <Icon name="ArrowRight" size={10} className="text-slate-400" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recently Used History */}
                  {recents.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1.5 flex items-center gap-1">
                        <Icon name="History" className="text-slate-400" size={10} />
                        最近使用
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {recents.map((recId) => {
                          const item = TOOL_REGISTRY.find((t) => t.id === recId);
                          if (!item) return null;
                          return (
                            <button
                              key={recId}
                              onClick={() => launchTool(recId)}
                              className={`text-left text-xs px-3 py-1.5 rounded-md font-bold truncate transition-colors cursor-pointer flex items-center justify-between ${
                                activeToolId === recId
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <span className="truncate">{item.title}</span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {usageStats[recId] || 1}次
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold flex flex-col gap-1 bg-slate-50/50 shrink-0">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Icon name="ShieldCheck" className="text-slate-500" size={12} />
                    暖心百宝箱 v1.0
                  </div>
                  <div>当前北京时间 2026-07-08</div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Content Panel */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
          
          {/* DASHBOARD: GRID DIRECTORY HOME SCREEN */}
          {!activeToolId ? (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
              
              {/* Brand Welcome Card (only on 'all' category main screen) */}
              {activeCategory === 'all' && (
                <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-md border border-slate-950 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20"></div>
                  <img src="/logo.svg" className="h-24 w-24 rounded-2xl shrink-0 shadow-lg border border-white/15" alt="暖心工作箱" referrerPolicy="no-referrer" />
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2">
                      暖心工作箱
                      <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 text-white/80 px-2 py-0.5 rounded-full">v1.0</span>
                    </h2>
                    <p className="text-xs md:text-sm text-slate-300 mt-2 font-medium max-w-2xl leading-relaxed">
                      一个安全、好用、温暖贴心的本地优先开发者百宝箱。所有加密解密、转换解析、网络计算均在您的浏览器本地沙盒安全完成，数据绝不上传服务器，全方位守护您的代码与安全隐私。
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-4 text-[10px] font-bold text-slate-400">
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-1">🔒 100% 本地运算</span>
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-1">⚡ 毫秒级极速响应</span>
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-1">🎨 精致极简设计</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Active State Details */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    当前展示：
                    <span className="text-slate-900 border-b-2 border-black pb-0.5">
                      {CATEGORIES.find((c) => c.id === activeCategory)?.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">
                    在下方挑选您需要的高频工具，所有计算均安全不落地。
                  </p>
                </div>

                <div className="text-xs font-bold text-slate-400">
                  共找到 <strong className="text-slate-800 font-bold">{filteredTools.length}</strong> 个匹配的小工具
                </div>
              </div>

              {/* Grid cards */}
              {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTools.map((tool) => {
                    const isStarred = favorites.includes(tool.id);
                    const count = usageStats[tool.id] || 0;
                    return (
                      <div
                        key={tool.id}
                        className="bg-white rounded-xl border border-slate-200 p-5 hover:border-black transition-all flex flex-col justify-between group relative shadow-2xs"
                      >
                        {/* Favorite star trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(tool.id);
                          }}
                          className="absolute top-4 right-4 p-1.5 rounded text-slate-300 hover:text-slate-800 transition-all cursor-pointer"
                          title={isStarred ? '取消收藏' : '加入收藏'}
                        >
                          <Icon name="Star" className={isStarred ? 'fill-slate-900 text-slate-900' : ''} size={16} />
                        </button>

                        <div className="cursor-pointer flex flex-col gap-3" onClick={() => launchTool(tool.id)}>
                          <div className="p-3 bg-slate-50 text-slate-900 rounded border border-slate-200/60 self-start">
                            <Icon name={tool.icon} size={20} />
                          </div>
                          
                          <div>
                            <h4 className="font-extrabold text-slate-900 group-hover:text-black transition-colors text-sm flex items-center gap-2">
                              {tool.title}
                            </h4>
                            <p className="text-xs text-slate-500 leading-normal font-semibold mt-1.5">{tool.description}</p>
                          </div>
                        </div>

                        {/* Footer tags */}
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-bold uppercase">
                            {getCategoryName(tool.category)}
                          </span>
                          
                          {count > 0 && (
                            <span className="font-mono bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-200">
                              已用 {count} 次
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-16 text-center text-slate-400 max-w-md mx-auto flex flex-col items-center gap-3">
                  <Icon name="Search" size={32} className="text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">没有找到匹配的小工具</p>
                  <span className="text-xs">您可以尝试清空搜索框或选择“全部工具”重试。</span>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                    }}
                    className="mt-2 text-xs bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold py-1.5 px-4 rounded-md transition-colors cursor-pointer border border-slate-300"
                  >
                    重置所有筛选
                  </button>
                </div>
              )}

            </div>
          ) : (
            
            // TOOL WORKSPACE VIEW: SELECTED ACTIVE TOOL PANEL
            <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full animate-fadeIn">
              
              {/* Back to hall & quick header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex flex-col gap-2">
                  
                  {/* breadcrumb row */}
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-bold">
                    <button onClick={() => changeActiveToolId(null)} className="hover:text-black cursor-pointer flex items-center gap-1">
                      <Icon name="Cpu" size={12} />
                      百宝箱主页
                    </button>
                    <span>/</span>
                    <span className="text-slate-600 font-extrabold">{getCategoryName(activeToolItem?.category || 'image')}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{activeToolItem?.title}</h2>
                    
                    <button
                      onClick={() => activeToolId && toggleFavorite(activeToolId)}
                      className="p-1.5 rounded text-slate-300 hover:text-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                      title={favorites.includes(activeToolId) ? '取消收藏' : '加入收藏'}
                    >
                      <Icon name="Star" className={favorites.includes(activeToolId) ? 'fill-slate-900 text-slate-900' : ''} size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-normal max-w-2xl font-semibold">{activeToolItem?.description}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => changeActiveToolId(null)}
                    className="text-xs bg-slate-900 hover:bg-black text-white font-extrabold px-3.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Icon name="ArrowRight" className="rotate-180" size={14} />
                    返回工具大厅
                  </button>
                </div>
              </div>

              {/* Tool Screen Mounting */}
              <div className="flex-1">
                {renderToolScreen()}
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
