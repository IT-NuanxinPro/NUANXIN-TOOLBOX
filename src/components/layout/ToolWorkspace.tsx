import { getCategoryName } from '../../registry';
import { ToolScreen } from '../../toolComponents';
import type { ToolRegistryItem } from '../../types';
import { Icon } from '../Icon';

interface ToolWorkspaceProps {
  activeToolId: string;
  activeToolItem?: ToolRegistryItem;
  favorites: string[];
  onBackHome: () => void;
  onRecordUsage: (toolId?: string) => void;
  onToggleFavorite: (toolId: string) => void;
}

export function ToolWorkspace({
  activeToolId,
  activeToolItem,
  favorites,
  onBackHome,
  onRecordUsage,
  onToggleFavorite,
}: ToolWorkspaceProps) {
  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-400 font-bold">
            <button onClick={onBackHome} className="hover:text-black cursor-pointer flex items-center gap-1">
              <Icon name="Cpu" size={12} />
              百宝箱主页
            </button>
            <span>/</span>
            <span className="text-slate-600 font-extrabold">{getCategoryName(activeToolItem?.category || 'image')}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">{activeToolItem?.title}</h2>

            <button
              onClick={() => onToggleFavorite(activeToolId)}
              className="p-1.5 rounded text-slate-300 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title={favorites.includes(activeToolId) ? '取消收藏' : '加入收藏'}
            >
              <Icon name="Star" className={favorites.includes(activeToolId) ? 'fill-slate-900 text-slate-900' : ''} size={16} />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-normal max-w-2xl font-semibold">{activeToolItem?.description}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onBackHome}
            className="text-xs bg-slate-900 hover:bg-black text-white font-extrabold px-3.5 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Icon name="ArrowRight" className="rotate-180" size={14} />
            返回工具大厅
          </button>
        </div>
      </div>

      <div className="flex-1">
        <ToolScreen toolId={activeToolId} toolTitle={activeToolItem?.title} onRecordUsage={onRecordUsage} />
      </div>
    </div>
  );
}
