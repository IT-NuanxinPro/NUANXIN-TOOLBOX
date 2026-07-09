import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { TOOL_REGISTRY, CATEGORIES } from '../registry';
import { ToolRegistryItem } from '../types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectTool: (id: string) => void;
  favorites: string[];
  recent: string[];
  onToggleFavorite: (id: string) => void;
}

interface CommandItem {
  id: string;
  type: 'tool' | 'action';
  title: string;
  subtitle?: string;
  icon: string;
  toolId?: string;
  action?: () => void;
  keywords: string[];
  group: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onSelectTool,
  favorites,
  recent,
  onToggleFavorite,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 构建命令列表
  const commands = useMemo<CommandItem[]>(() => {
    const toolCmds: CommandItem[] = TOOL_REGISTRY.map((t) => ({
      id: `tool-${t.id}`,
      type: 'tool' as const,
      title: t.title,
      subtitle: t.description,
      icon: t.icon,
      toolId: t.id,
      keywords: [t.title, ...t.keywords, t.category],
      group: '工具',
    }));
    return toolCmds;
  }, []);

  // 搜索结果
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // 默认排序:收藏 → 最近 → 全部
      const favItems = commands.filter((c) => c.toolId && favorites.includes(c.toolId));
      const recentItems = commands
        .filter((c) => c.toolId && recent.includes(c.toolId))
        .sort((a, b) => recent.indexOf(a.toolId!) - recent.indexOf(b.toolId!));
      const rest = commands.filter(
        (c) => !favorites.includes(c.toolId || '') && !recent.includes(c.toolId || '')
      );
      return [
        ...(favItems.length ? [{ header: '收藏' }, ...favItems] : []),
        ...(recentItems.length ? [{ header: '最近使用' }, ...recentItems] : []),
        { header: '全部工具' },
        ...rest,
      ] as (CommandItem | { header: string })[];
    }
    const q = query.toLowerCase();
    return commands
      .filter((c) => c.keywords.some((k) => k.toLowerCase().includes(q)))
      .slice(0, 20);
  }, [query, commands, favorites, recent]);

  // 可选项目(过滤掉 header)
  const selectableItems = filtered.filter((item): item is CommandItem => 'type' in item);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // 滚动到当前项
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(selectableItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + selectableItems.length) % Math.max(selectableItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = selectableItems[activeIndex];
      if (item?.toolId) {
        onSelectTool(item.toolId);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 搜索框 */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              <Icon name="Search" className="text-slate-400" size={18} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索工具,或输入关键词..."
                className="flex-1 text-sm bg-transparent border-0 outline-hidden p-0 text-slate-900 placeholder-slate-400 font-semibold"
              />
              <kbd className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                ESC
              </kbd>
            </div>

            {/* 列表 */}
            <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
              {selectableItems.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Icon name="Search" size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400 font-semibold">没有找到匹配的工具</p>
                  <p className="text-xs text-slate-400 mt-1">试试其他关键词</p>
                </div>
              ) : (
                filtered.map((item, idx) => {
                  if ('header' in item) {
                    return (
                      <div
                        key={`h-${item.header}`}
                        className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                      >
                        {item.header}
                      </div>
                    );
                  }
                  const selectableIdx = selectableItems.indexOf(item);
                  const isActive = selectableIdx === activeIndex;
                  const isFav = item.toolId && favorites.includes(item.toolId);
                  return (
                    <div
                      key={item.id}
                      data-idx={selectableIdx}
                      onMouseEnter={() => setActiveIndex(selectableIdx)}
                      onClick={() => {
                        if (item.toolId) {
                          onSelectTool(item.toolId);
                          onClose();
                        }
                      }}
                      className={`mx-2 px-3 py-2.5 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
                        isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`p-2 rounded-md ${
                        isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon name={item.icon} size={14} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className={`text-[11px] truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      {isFav && (
                        <Icon name="Star" size={12} className={isActive ? 'text-amber-400' : 'text-amber-500'} fill="currentColor" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 底部提示 */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                <span className="flex items-center gap-1">
                  <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold">↑↓</kbd>
                  导航
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold">↵</kbd>
                  选择
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                共 {TOOL_REGISTRY.length} 个工具
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
