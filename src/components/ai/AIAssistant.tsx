import { useEffect, useMemo, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import { AnimatePresence, motion } from 'motion/react';
import { TOOL_BY_ID } from '../../registry';
import type { ToolRegistryItem } from '../../types';
import { usePersistentState } from '../../hooks/usePersistentState';
import { requestAIChat, type AIChatMessage } from '../../services/aiClient';
import { Icon } from '../Icon';

const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });
const TOOL_ACTION_PATTERN = /\[\[tool:([a-z0-9-]+)\|([^\]]+)\]\]/gi;

interface StoredMessage extends AIChatMessage {
  id: string;
  error?: boolean;
}

interface ToolAction {
  id: string;
  label: string;
}

interface AIAssistantProps {
  activeToolItem?: ToolRegistryItem;
  onLaunchTool: (toolId: string) => void;
}

function parseToolActions(content: string) {
  const actions: ToolAction[] = [];
  const cleanContent = content.replace(TOOL_ACTION_PATTERN, (_match, id: string, label: string) => {
    if (TOOL_BY_ID.has(id)) actions.push({ id, label: label.trim() });
    return '';
  }).trim();

  return { actions, cleanContent };
}

function createMessage(role: StoredMessage['role'], content: string, error = false): StoredMessage {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    role,
    content,
    error,
  };
}

export function AIAssistant({ activeToolItem, onLaunchTool }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = usePersistentState<StoredMessage[]>('toolbox_ai_messages', []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const suggestions = useMemo(() => {
    if (activeToolItem) {
      return [
        `怎么正确使用${activeToolItem.title}？`,
        '这个工具的结果下一步可以怎么处理？',
        '推荐与当前工具相关的其他工具',
      ];
    }
    return [
      '我应该用什么工具处理这段数据？',
      '帮我设计一条接口调试工作流',
      '推荐前端开发最常用的工具',
    ];
  }, [activeToolItem]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMessage = async (preset?: string) => {
    const content = (preset ?? input).trim();
    if (!content || loading) return;

    const userMessage = createMessage('user', content);
    const history = messages
      .filter((message) => !message.error)
      .slice(-10)
      .map(({ role, content: messageContent }) => ({ role, content: messageContent }));

    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const answer = await requestAIChat(
        [...history, { role: 'user', content }],
        {
          activeToolId: activeToolItem?.id,
          activeToolTitle: activeToolItem?.title,
          activeToolDescription: activeToolItem?.description,
        },
        abortRef.current.signal
      );
      setMessages((previous) => [...previous, createMessage('assistant', answer)]);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setMessages((previous) => [
        ...previous,
        createMessage(
          'assistant',
          error instanceof Error ? error.message : '暖心 AI 暂时无法响应，请稍后再试。',
          true
        ),
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const startNewChat = () => {
    abortRef.current?.abort();
    setLoading(false);
    setMessages([]);
    setInput('');
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            key="ai-fab"
            initial={{ opacity: 0, y: 16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.82 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed right-5 bottom-5 z-[70]"
          >
            <button
              onClick={() => setOpen(true)}
              className="ai-fab group flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full pl-3.5 pr-4 py-3 shadow-xl border border-slate-700 cursor-pointer btn-press"
              title="打开暖心 AI 助手"
            >
              <span className="ai-fab-icon relative flex items-center justify-center">
                <Icon name="Sparkles" size={18} />
              </span>
              <span className="text-xs font-black">暖心 AI</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
        <motion.aside
          key="ai-panel"
          layout
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          className={`fixed z-[70] bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            fullscreen
              ? 'inset-3 md:inset-6 rounded-2xl'
              : 'right-4 bottom-4 w-[min(32rem,calc(100vw-2rem))] h-[min(760px,calc(100vh-5rem))] rounded-2xl max-md:inset-2 max-md:w-auto max-md:h-auto'
          }`}
          aria-label="暖心 AI 助手"
        >
          <header className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0">
            <span className="p-2 bg-slate-900 text-white rounded-lg"><Icon name="Sparkles" size={16} /></span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900">暖心 AI</h2>
              <p className="text-[10px] text-slate-400 font-semibold truncate">
                {activeToolItem ? `正在协助：${activeToolItem.title}` : '开发工具与工作流助手'}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={startNewChat} className="p-2 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer" title="新对话">
                <Icon name="Plus" size={15} />
              </button>
              <button onClick={() => setFullscreen((value) => !value)} className="p-2 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer" title={fullscreen ? '退出全屏' : '全屏'}>
                <Icon name={fullscreen ? 'Minimize2' : 'Maximize2'} size={15} />
              </button>
              <button onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer" title="收起">
                <Icon name="X" size={16} />
              </button>
            </div>
          </header>

          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-[10px] font-semibold text-slate-500 shrink-0">
            <Icon name="ShieldCheck" size={12} className="text-emerald-600" />
            <span>仅发送对话和当前工具名称，不会自动读取页面输入</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="py-3">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-sm">
                  <Icon name="Wand2" size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900">有什么开发问题？</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2">
                  我可以推荐工具、解释结果，并把你的任务拆成一条清晰的本地处理流程。
                </p>
                <div className="flex flex-col gap-2 mt-5">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      className="text-left text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 cursor-pointer flex items-center gap-2"
                    >
                      <Icon name="ArrowRight" size={13} className="text-slate-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const { actions, cleanContent } = parseToolActions(message.content);
              const rendered = message.role === 'assistant' && !message.error
                ? markdown.render(cleanContent)
                : '';
              return (
                <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-3 ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white rounded-br-md'
                      : message.error
                        ? 'bg-rose-50 border border-rose-100 text-rose-700 rounded-bl-md'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 rounded-bl-md'
                  }`}>
                    {message.role === 'assistant' && !message.error ? (
                      <div className="prose prose-sm max-w-none text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: rendered }} />
                    ) : (
                      <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                    {actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200">
                        {actions.map((action) => (
                          <button
                            key={`${message.id}-${action.id}-${action.label}`}
                            onClick={() => onLaunchTool(action.id)}
                            className="text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md px-2.5 py-1.5 cursor-pointer flex items-center gap-1.5"
                          >
                            <Icon name={TOOL_BY_ID.get(action.id)?.icon || 'ArrowRight'} size={11} />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {message.role === 'assistant' && !message.error && (
                      <button
                        onClick={() => navigator.clipboard.writeText(cleanContent)}
                        className="mt-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="复制回答"
                      >
                        <Icon name="Copy" size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                  <Icon name="Loader2" size={14} className="animate-spin text-slate-500" />
                  <span className="text-xs font-bold text-slate-500">正在思考并匹配工具…</span>
                </div>
              </div>
            )}
          </div>

          <footer className="p-3 border-t border-slate-200 bg-white shrink-0">
            <div className="border border-slate-300 focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-900/5 rounded-xl p-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="随便问点什么…"
                rows={2}
                className="w-full resize-none border-0 outline-hidden bg-transparent text-xs text-slate-900 placeholder:text-slate-400 leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Icon name="Sparkles" size={11} /> 快速模式
                </span>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer btn-press"
                  title="发送"
                >
                  <Icon name="Send" size={14} />
                </button>
              </div>
            </div>
            <p className="text-[9px] text-center text-slate-400 font-semibold mt-2">AI 可能出错，关键结论请使用本地工具验证。</p>
          </footer>
        </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
