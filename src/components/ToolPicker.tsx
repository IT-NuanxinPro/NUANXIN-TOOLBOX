import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { TOOL_REGISTRY } from '../registry';
import { toolBridge } from '../contexts/ToolBridgeContext';

interface ToolPickerProps {
  currentToolId?: string;
  onSelect: (toolId: string) => void;
}

export const ToolPicker: React.FC<ToolPickerProps> = ({ currentToolId, onSelect }) => {
  const [, setTick] = useState(0);
  const pickerState = toolBridge.getPickerState();
  const [query, setQuery] = useState('');

  // 订阅状态变化
  useEffect(() => toolBridge.subscribe(() => setTick((t) => t + 1)), []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return TOOL_REGISTRY.filter(
      (t) => t.id !== currentToolId && (t.title.toLowerCase().includes(q) || t.keywords.some((k) => k.toLowerCase().includes(q)))
    );
  }, [query, currentToolId]);

  const handleSelect = (toolId: string) => {
    onSelect(toolId);
    toolBridge.closePicker();
    setQuery('');
  };

  return (
    <AnimatePresence>
      {pickerState.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={toolBridge.closePicker}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Icon name="Share2" size={16} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-900">发送到其他工具</span>
              <span className="text-[10px] text-slate-400 ml-auto">
                {pickerState.data ? `${pickerState.data.length} 字符` : ''}
              </span>
            </div>
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 focus-within:ring-1 focus-within:ring-black">
                <Icon name="Search" size={14} className="text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索目标工具..."
                  className="flex-1 text-xs bg-transparent border-0 outline-hidden p-0 text-slate-900 placeholder-slate-400 font-semibold"
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-slate-400">没有匹配的工具</div>
              ) : (
                filtered.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className="mx-2 px-3 py-2.5 rounded-lg cursor-pointer flex items-center gap-3 hover:bg-slate-100 transition-colors"
                  >
                    <span className="p-2 rounded-md bg-slate-100 text-slate-600">
                      <Icon name={t.icon} size={14} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{t.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{t.description}</div>
                    </div>
                    <Icon name="ChevronRight" size={14} className="text-slate-300" />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
