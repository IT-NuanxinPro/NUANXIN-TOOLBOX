import { Icon } from '../Icon';
import type { Theme } from '../../hooks/useTheme';

interface AppHeaderProps {
  activeToolId: string | null;
  sidebarOpen: boolean;
  theme: Theme;
  onBackHome: () => void;
  onOpenCommandPalette: () => void;
  onSetTheme: (theme: Theme) => void;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
}

export function AppHeader({
  activeToolId,
  sidebarOpen,
  theme,
  onBackHome,
  onOpenCommandPalette,
  onSetTheme,
  onToggleSidebar,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-md transition-colors cursor-pointer font-bold ${
            sidebarOpen
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:text-slate-900'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200 hover:text-indigo-700'
          }`}
          title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          id={sidebarOpen ? 'btn-collapse-sidebar' : 'btn-expand-sidebar'}
        >
          <Icon name={sidebarOpen ? 'PanelLeftClose' : 'PanelLeftOpen'} size={13} />
        </button>

        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onBackHome}>
          <img
            src="/logo.svg"
            className="h-8 w-8 rounded-lg shrink-0 object-contain shadow-xs border border-slate-200/40"
            alt="暖心工作箱 Logo"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="font-extrabold text-slate-900 text-sm tracking-tight leading-none flex items-center gap-1.5">
              暖心工作箱
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1">简约高效的开发辅助百宝箱</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 px-4 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors cursor-pointer font-semibold min-w-[200px] justify-start"
          title="打开命令面板 (⌘K)"
        >
          <Icon name="Search" size={13} className="text-slate-400" />
          <span className="flex-1 text-left">搜索工具...</span>
          <kbd className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-400 shrink-0">⌘K</kbd>
        </button>

        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          title={theme === 'dark' ? '切换到亮色' : theme === 'light' ? '切换到暗色' : '切换主题'}
        >
          <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
        </button>

        <div className="hidden md:flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
          {(['light', 'system', 'dark'] as const).map((nextTheme) => (
            <button
              key={nextTheme}
              onClick={() => onSetTheme(nextTheme)}
              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                theme === nextTheme ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title={nextTheme === 'light' ? '亮色' : nextTheme === 'dark' ? '暗色' : '跟随系统'}
            >
              <Icon name={nextTheme === 'light' ? 'Sun' : nextTheme === 'dark' ? 'Moon' : 'Monitor'} size={12} />
            </button>
          ))}
        </div>

        {activeToolId && (
          <button
            onClick={onBackHome}
            className="text-xs bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200"
          >
            <Icon name="FileText" size={12} />
            返回工具大厅
          </button>
        )}
      </div>
    </header>
  );
}
