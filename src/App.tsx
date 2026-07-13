import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TOOL_REGISTRY, TOOL_BY_ID, isKnownToolId } from './registry';
import { CommandPalette } from './components/CommandPalette';
import { ToolPicker } from './components/ToolPicker';
import { AppHeader } from './components/layout/AppHeader';
import { Dashboard } from './components/layout/Dashboard';
import { Sidebar } from './components/layout/Sidebar';
import { ToolWorkspace } from './components/layout/ToolWorkspace';
import { useTheme } from './hooks/useTheme';
import { usePersistentState } from './hooks/usePersistentState';

const getToolIdFromHash = () => {
  if (typeof window === 'undefined') return null;
  const id = window.location.hash.replace(/^#\/?/, '').trim();
  return isKnownToolId(id) ? id : null;
};

const AIAssistant = lazy(() =>
  import('./components/ai/AIAssistant').then((module) => ({ default: module.AIAssistant }))
);

export default function App() {
  return <AppContent />;
}

function AppContent() {
  const [favorites, setFavorites] = usePersistentState<string[]>('toolbox_favorites', []);
  const [recents, setRecents] = usePersistentState<string[]>('toolbox_recents', []);
  const [usageStats, setUsageStats] = usePersistentState<Record<string, number>>('toolbox_usage_stats', {});

  const [activeToolId, setActiveToolId] = useState<string | null>(() => getToolIdFromHash());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const { theme, setTheme, toggle } = useTheme();

  const mainRef = useRef<HTMLElement>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});

  const syncToolHash = useCallback((newId: string | null) => {
    if (typeof window === 'undefined') return;

    const nextHash = newId ? `#/${newId}` : '';
    if (window.location.hash !== nextHash) {
      const nextUrl = newId ? nextHash : `${window.location.pathname}${window.location.search}`;
      window.history.pushState(null, '', nextUrl);
    }
  }, []);

  // 切换工具前先保存滚动位置,避免大厅与工具页来回跳转时丢失上下文
  const changeActiveToolId = useCallback((newId: string | null, shouldSyncHash = true) => {
    const mainElement = mainRef.current;
    if (mainElement) {
      const currentKey = activeToolId || 'lobby';
      scrollPositionsRef.current[currentKey] = mainElement.scrollTop;
    }
    setActiveToolId(newId);
    if (shouldSyncHash) syncToolHash(newId);
  }, [activeToolId, syncToolHash]);

  useEffect(() => {
    const handleRouteChange = () => changeActiveToolId(getToolIdFromHash(), false);
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [changeActiveToolId]);

  // LayoutEffect to restore scroll positions when activeToolId changes
  useLayoutEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const key = activeToolId || 'lobby';
    const savedPosition = scrollPositionsRef.current[key] || 0;
    mainElement.scrollTop = savedPosition;
  }, [activeToolId]);

  // Cmd+K / Ctrl+K 打开命令面板
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Handle Recording of Tool Usage
  const handleRecordUsage = useCallback((idStr?: string) => {
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
  }, [activeToolId, setRecents, setUsageStats]);

  // Star / Favorite toggle
  const toggleFavorite = useCallback((idStr: string) => {
    setFavorites((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
    );
  }, [setFavorites]);

  // Launch tool from clicking
  const launchTool = useCallback((idStr: string) => {
    changeActiveToolId(idStr);
    handleRecordUsage(idStr);
  }, [changeActiveToolId, handleRecordUsage]);

  // 从 ToolPicker 选择目标工具后,发送数据并跳转
  const handlePickerSelect = useCallback((targetToolId: string) => {
    // 数据已经在 ToolBridgeContext 里,目标工具通过 consumeTransfer 获取
    changeActiveToolId(targetToolId);
    handleRecordUsage(targetToolId);
  }, [changeActiveToolId, handleRecordUsage]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredTools = useMemo(() => {
    return TOOL_REGISTRY.filter((tool) => {
      const matchesSearch =
        normalizedSearch === '' ||
        tool.title.toLowerCase().includes(normalizedSearch) ||
        tool.description.toLowerCase().includes(normalizedSearch) ||
        tool.keywords.some((k) => k.toLowerCase().includes(normalizedSearch));

      const matchesCategory = normalizedSearch !== '' || activeCategory === 'all' || tool.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, normalizedSearch]);

  // Current active tool item
  const activeToolItem = activeToolId ? TOOL_BY_ID.get(activeToolId) : undefined;

  return (
    <div className="h-screen bg-white flex flex-col font-sans text-slate-900 selection:bg-slate-200 antialiased overflow-hidden">
      <AppHeader
        activeToolId={activeToolId}
        sidebarOpen={sidebarOpen}
        theme={theme}
        onBackHome={() => changeActiveToolId(null)}
        onOpenCommandPalette={() => setCmdkOpen(true)}
        onSetTheme={setTheme}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onToggleTheme={toggle}
      />

      <div className="flex-1 flex items-stretch overflow-hidden">
        {sidebarOpen && (
          <Sidebar
            activeCategory={activeCategory}
            activeToolId={activeToolId}
            favorites={favorites}
            searchQuery={searchQuery}
            onBackHome={() => changeActiveToolId(null)}
            onLaunchTool={launchTool}
            onSearchChange={setSearchQuery}
            onSelectCategory={setActiveCategory}
          />
        )}

        <main ref={mainRef} className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
          {!activeToolId ? (
            <Dashboard
              activeCategory={activeCategory}
              activeToolId={activeToolId}
              favorites={favorites}
              filteredTools={filteredTools}
              isSearching={normalizedSearch !== ''}
              recent={recents}
              usageStats={usageStats}
              onLaunchTool={launchTool}
              onResetFilters={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              onSelectCategory={setActiveCategory}
              onToggleFavorite={toggleFavorite}
            />
          ) : (
            <ToolWorkspace
              activeToolId={activeToolId}
              activeToolItem={activeToolItem}
              favorites={favorites}
              onBackHome={() => changeActiveToolId(null)}
              onRecordUsage={handleRecordUsage}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </main>
      </div>

      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onSelectTool={launchTool}
        favorites={favorites}
        recent={recents}
        onToggleFavorite={toggleFavorite}
      />

      <ToolPicker currentToolId={activeToolId || undefined} onSelect={handlePickerSelect} />

      <Suspense fallback={null}>
        <AIAssistant activeToolItem={activeToolItem} onLaunchTool={launchTool} />
      </Suspense>
    </div>
  );
}
