import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  TOOL_BY_ID,
  TOOL_REGISTRY,
  TOOL_TRANSFER_TARGET_IDS,
  getCategoryName,
} from '../../registry';
import { toolBridge } from '../../contexts/ToolBridgeContext';
import type { ToolRegistryItem } from '../../types';
import { detectToolInput } from '../../utils/detectToolInput';
import { Icon } from '../Icon';

interface DashboardProps {
  activeCategory: string;
  activeToolId: string | null;
  favorites: string[];
  filteredTools: ToolRegistryItem[];
  isSearching: boolean;
  recent: string[];
  usageStats: Record<string, number>;
  onLaunchTool: (toolId: string) => void;
  onResetFilters: () => void;
  onSelectCategory: (categoryId: string) => void;
  onToggleFavorite: (toolId: string) => void;
}

const TASK_SHORTCUTS = [
  { title: '调试接口', description: 'HTTP、cURL、JWT 与状态诊断', icon: 'Send', categoryId: 'api' },
  { title: '处理数据', description: 'JSON、YAML、SQL 与类型生成', icon: 'Database', categoryId: 'data' },
  { title: '生成前端代码', description: 'CSS、颜色与代码场实时预览', icon: 'Code2', categoryId: 'frontend' },
  { title: '处理图片资源', description: 'SVG、二维码与 Favicon', icon: 'Image', categoryId: 'assets' },
  { title: '编码与安全', description: 'Base64、哈希、AES 与 RSA', icon: 'ShieldCheck', categoryId: 'security' },
  { title: '排查网络问题', description: 'CIDR、Linux、Cron 与运维配置', icon: 'Server', categoryId: 'ops' },
];

const WORKFLOWS = [
  {
    title: '接口响应生成类型',
    description: '格式化 JSON，再生成 TypeScript 接口。',
    toolIds: ['json-yaml', 'json-to-ts'],
  },
  {
    title: '接口鉴权排查',
    description: '解析 JWT，并继续检查请求与状态码。',
    toolIds: ['jwt-debugger', 'http-request-tester', 'http-status-helper'],
  },
  {
    title: '前端资源处理',
    description: '转换 SVG，再生成站点图标或 Base64。',
    toolIds: ['svg-converter', 'favicon-generator', 'base64'],
  },
];

export function Dashboard({
  activeCategory,
  activeToolId,
  favorites,
  filteredTools,
  isSearching,
  recent,
  usageStats,
  onLaunchTool,
  onResetFilters,
  onSelectCategory,
  onToggleFavorite,
}: DashboardProps) {
  const [pasteValue, setPasteValue] = useState('');
  const detectedInput = useMemo(() => detectToolInput(pasteValue), [pasteValue]);
  const personalTools = useMemo(
    () => [...new Set([...recent, ...favorites])]
      .map((toolId) => TOOL_BY_ID.get(toolId))
      .filter((tool): tool is ToolRegistryItem => Boolean(tool))
      .slice(0, 6),
    [favorites, recent]
  );

  const launchWithPaste = (toolId: string) => {
    if (pasteValue.trim() && TOOL_TRANSFER_TARGET_IDS.has(toolId)) {
      toolBridge.sendToTool(toolId, pasteValue.trim());
    }
    onLaunchTool(toolId);
  };

  const activeCategoryItem = CATEGORIES.find((category) => category.id === activeCategory);
  const showWorkbench = activeCategory === 'all' && !isSearching;

  return (
    <div className="app-content-shell flex flex-col gap-6">
      {showWorkbench && (
        <>
          <section className="workbench-hero rounded-2xl p-5 md:p-7 shadow-sm overflow-hidden relative">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-200/30 blur-2xl" />
            <div className="absolute left-[38%] -bottom-24 h-44 w-44 rounded-full bg-sky-100/70 blur-3xl" />
            <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] gap-6 xl:items-center">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-slate-900 border border-slate-800 rounded-full px-3 py-1 mb-4 shadow-sm">
                  <Icon name="Sparkles" size={12} />
                  暖心开发工作台
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-950">开发数据，粘贴即处理</h2>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed max-w-xl font-semibold">
                  粘贴 JSON、JWT、URL、cURL、SQL 或代码片段，自动识别内容并推荐最合适的本地工具。
                </p>
                <div className="flex flex-wrap gap-2 mt-5 text-[10px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 bg-white/80 border border-slate-200 rounded-full px-2.5 py-1"><Icon name="ShieldCheck" size={12} className="text-emerald-600" /> 本地处理</span>
                  <span className="bg-white/80 border border-slate-200 rounded-full px-2.5 py-1">无需登录</span>
                  <span className="bg-white/80 border border-slate-200 rounded-full px-2.5 py-1">数据默认不上传</span>
                </div>
              </div>

              <div className="workbench-paste-panel rounded-2xl p-2.5 text-slate-900">
                <textarea
                  value={pasteValue}
                  onChange={(event) => setPasteValue(event.target.value)}
                  placeholder="在这里粘贴内容，试试 JSON、JWT、URL 或 cURL…"
                  rows={4}
                  className="w-full resize-none bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-mono outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 placeholder:text-slate-400 shadow-inner"
                />
                {detectedInput ? (
                  <div className="mt-2.5 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <span className="p-1.5 rounded-md bg-slate-900 text-white shrink-0">
                        <Icon name="Wand2" size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900">识别为：{detectedInput.type}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{detectedInput.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {detectedInput.toolIds.map((toolId, index) => {
                        const tool = TOOL_BY_ID.get(toolId);
                        if (!tool) return null;
                        return (
                          <button
                            key={toolId}
                            onClick={() => launchWithPaste(toolId)}
                            className={`btn-press text-[11px] font-bold rounded-md px-3 py-1.5 border cursor-pointer flex items-center gap-1.5 ${
                              index === 0
                                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Icon name={tool.icon} size={12} />
                            {tool.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="px-2 pt-2.5 pb-1 text-[10px] text-slate-500 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1"><Icon name="ShieldCheck" size={10} /> 内容只用于本地识别</span>
                    <span>支持 8+ 种数据格式</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between gap-4 mb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">你现在想做什么？</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">按任务进入，不需要先记住工具名称。</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
              {TASK_SHORTCUTS.map((task) => (
                <button
                  key={task.categoryId}
                  onClick={() => onSelectCategory(task.categoryId)}
                  className="group text-left bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 cursor-pointer card-hover shadow-2xs"
                >
                  <span className="inline-flex p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <Icon name={task.icon} size={17} />
                  </span>
                  <span className="block text-sm font-black text-slate-900 mt-3">{task.title}</span>
                  <span className="block text-[11px] leading-relaxed text-slate-500 font-semibold mt-1">{task.description}</span>
                </button>
              ))}
            </div>
          </section>

          {personalTools.length > 0 && (
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Icon name="Clock" size={15} />
                  继续使用
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">最近与收藏仅保存在当前浏览器</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-2.5">
                {personalTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => onLaunchTool(tool.id)}
                    className="bg-white border border-slate-200 hover:border-slate-400 rounded-lg p-3 text-left cursor-pointer flex items-center gap-2.5 min-w-0"
                  >
                    <span className="p-2 bg-slate-50 rounded-md border border-slate-100 shrink-0"><Icon name={tool.icon} size={14} /></span>
                    <span className="text-xs font-bold text-slate-800 truncate">{tool.title}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="font-black text-slate-900 text-base">推荐工作流</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3 font-semibold">把高频小工具串起来，减少复制、搜索和页面切换。</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {WORKFLOWS.map((workflow) => (
                <div key={workflow.title} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <h4 className="text-sm font-black text-slate-900">{workflow.title}</h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">{workflow.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {workflow.toolIds.map((toolId, index) => {
                      const tool = TOOL_BY_ID.get(toolId);
                      if (!tool) return null;
                      return (
                        <div key={toolId} className="flex items-center gap-1.5">
                          {index > 0 && <Icon name="ArrowRight" size={11} className="text-slate-300" />}
                          <button
                            onClick={() => onLaunchTool(toolId)}
                            className="text-[10px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 cursor-pointer"
                          >
                            {tool.title}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            {isSearching ? '搜索结果：' : showWorkbench ? '完整工具目录：' : '当前分类：'}
            <span className="text-slate-900 border-b-2 border-black pb-0.5">
              {isSearching ? `${filteredTools.length} 个匹配项` : showWorkbench ? '全部工具' : activeCategoryItem?.name}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            {isSearching
              ? '搜索覆盖工具名称、说明和中英文关键词。'
              : showWorkbench
                ? '浏览所有能力，或通过左侧分类进一步缩小范围。'
                : activeCategoryItem?.description}
          </p>
        </div>

        <div className="text-xs font-bold text-slate-400">
          共找到 <strong className="text-slate-800 font-bold">{filteredTools.length}</strong> 个匹配的小工具
        </div>
      </div>

      {filteredTools.length > 0 ? (
        <div className="dashboard-tool-grid">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              active={activeToolId === tool.id}
              count={usageStats[tool.id] || 0}
              starred={favorites.includes(tool.id)}
              onLaunch={onLaunchTool}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
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

interface ToolCardProps {
  key?: string;
  active: boolean;
  count: number;
  starred: boolean;
  tool: ToolRegistryItem;
  onLaunch: (toolId: string) => void;
  onToggleFavorite: (toolId: string) => void;
}

function ToolCard({ active, count, starred, tool, onLaunch, onToggleFavorite }: ToolCardProps) {
  return (
    <div
      className={`tool-card card-hover bg-white rounded-xl border p-5 hover:border-black transition-colors flex flex-col justify-between group relative shadow-2xs ${
        active ? 'border-slate-900' : 'border-slate-200'
      }`}
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(tool.id);
        }}
        className="absolute top-4 right-4 p-1.5 rounded text-slate-300 hover:text-slate-800 transition-colors cursor-pointer"
        title={starred ? '取消收藏' : '加入收藏'}
      >
        <Icon name="Star" className={starred ? 'fill-slate-900 text-slate-900' : ''} size={16} />
      </button>

      <div className="cursor-pointer flex flex-col gap-3" onClick={() => onLaunch(tool.id)}>
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
}
