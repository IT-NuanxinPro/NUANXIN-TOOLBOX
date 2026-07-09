import { useEffect, useState } from 'react';
import { CATEGORIES, CATEGORY_COUNTS, TOOL_BY_ID } from '../../registry';
import { Icon } from '../Icon';

interface SidebarProps {
  activeCategory: string;
  activeToolId: string | null;
  favorites: string[];
  searchQuery: string;
  onBackHome: () => void;
  onLaunchTool: (toolId: string) => void;
  onSearchChange: (query: string) => void;
  onSelectCategory: (categoryId: string) => void;
}

function SidebarClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <span>当前北京时间 {now.toLocaleString('zh-CN', { hour12: false })}</span>;
}

export function Sidebar({
  activeCategory,
  activeToolId,
  favorites,
  searchQuery,
  onBackHome,
  onLaunchTool,
  onSearchChange,
  onSelectCategory,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
      <div className="w-64 h-full flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-black focus-within:border-black">
            <Icon name="Search" className="text-slate-400" size={14} />
            <input
              type="text"
              placeholder="搜索开发工具..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-full text-xs bg-transparent border-0 outline-hidden p-0 focus:ring-0 text-slate-800 placeholder-slate-400 font-semibold"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="text-slate-400 hover:text-slate-600">
                <Icon name="Trash2" size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1.5">工具分类</span>
            <nav className="flex flex-col gap-0.5">
              {CATEGORIES.map((category) => {
                const count = CATEGORY_COUNTS[category.id] || 0;

                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      onSelectCategory(category.id);
                      if (activeToolId) onBackHome();
                    }}
                    className={`text-left text-xs px-3 py-2 rounded-md font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      activeCategory === category.id
                        ? 'bg-slate-900 text-white font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{category.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeCategory === category.id ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {favorites.length > 0 && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1.5 flex items-center gap-1">
                <Icon name="Star" className="text-slate-900 fill-slate-900" size={10} />
                常用收藏
              </span>
              <div className="flex flex-col gap-0.5">
                {favorites.map((favoriteId) => {
                  const item = TOOL_BY_ID.get(favoriteId);
                  if (!item) return null;

                  return (
                    <button
                      key={favoriteId}
                      onClick={() => onLaunchTool(favoriteId)}
                      className={`text-left text-xs px-3 py-1.5 rounded-md font-bold truncate transition-colors cursor-pointer flex items-center justify-between ${
                        activeToolId === favoriteId
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
        </div>

        <div className="p-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold flex flex-col gap-1 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-1 text-slate-500">
            <Icon name="ShieldCheck" className="text-slate-500" size={12} />
            暖心百宝箱 v1.0
          </div>
          <div className="flex items-center justify-between">
            <SidebarClock />
            <a
              href="https://github.com/IT-NuanxinPro/NUANXIN-TOOLBOX"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors"
              title="GitHub 仓库"
            >
              <Icon name="Github" size={14} />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
