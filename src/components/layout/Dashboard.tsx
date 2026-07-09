import { CATEGORIES, TOOL_REGISTRY, getCategoryName } from '../../registry';
import type { ToolRegistryItem } from '../../types';
import { Icon } from '../Icon';

interface DashboardProps {
  activeCategory: string;
  activeToolId: string | null;
  favorites: string[];
  filteredTools: ToolRegistryItem[];
  usageStats: Record<string, number>;
  onLaunchTool: (toolId: string) => void;
  onResetFilters: () => void;
  onToggleFavorite: (toolId: string) => void;
}

export function Dashboard({
  activeCategory,
  activeToolId,
  favorites,
  filteredTools,
  usageStats,
  onLaunchTool,
  onResetFilters,
  onToggleFavorite,
}: DashboardProps) {
  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {activeCategory === 'all' && (
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Icon name="Sparkles" size={16} />
              全部功能
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              共 {TOOL_REGISTRY.length} 个工具
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-semibold">点击任意标签即可跳转到对应工具,所有计算均在浏览器本地完成。</p>
          <div className="flex flex-wrap gap-2">
            {TOOL_REGISTRY.map((item) => (
              <button
                key={item.id}
                onClick={() => onLaunchTool(item.id)}
                className={`btn-press text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeToolId === item.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <Icon name={item.icon} size={11} className="shrink-0 opacity-60" />
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            当前展示：
            <span className="text-slate-900 border-b-2 border-black pb-0.5">
              {CATEGORIES.find((category) => category.id === activeCategory)?.name}
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

      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => {
            const isStarred = favorites.includes(tool.id);
            const count = usageStats[tool.id] || 0;

            return (
              <div
                key={tool.id}
                className="tool-card card-hover bg-white rounded-xl border border-slate-200 p-5 hover:border-black transition-colors flex flex-col justify-between group relative shadow-2xs"
              >
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite(tool.id);
                  }}
                  className="absolute top-4 right-4 p-1.5 rounded text-slate-300 hover:text-slate-800 transition-colors cursor-pointer"
                  title={isStarred ? '取消收藏' : '加入收藏'}
                >
                  <Icon name="Star" className={isStarred ? 'fill-slate-900 text-slate-900' : ''} size={16} />
                </button>

                <div className="cursor-pointer flex flex-col gap-3" onClick={() => onLaunchTool(tool.id)}>
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
            onClick={onResetFilters}
            className="mt-2 text-xs bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold py-1.5 px-4 rounded-md transition-colors cursor-pointer border border-slate-300"
          >
            重置所有筛选
          </button>
        </div>
      )}
    </div>
  );
}
