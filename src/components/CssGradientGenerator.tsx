import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

type GradType = 'linear' | 'radial' | 'conic';

interface ColorStop { id: string; color: string; position: number }

const PRESETS: { name: string; css: string }[] = [
  { name: '紫色梦境', css: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { name: '夕阳橙焰', css: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { name: '青绿森林', css: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
  { name: '深海蓝', css: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { name: '玫瑰金', css: 'linear-gradient(135deg, #fa709a, #fee140)' },
  { name: '极光', css: 'linear-gradient(135deg, #a8edea, #fed6e3)' },
  { name: '夜空', css: 'linear-gradient(135deg, #232526, #414345)' },
  { name: '霓虹', css: 'conic-gradient(from 0deg, #ff0080, #ff8c00, #ff0080)' },
];

export const CssGradientGenerator: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [type, setType] = useState<GradType>('linear');
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<ColorStop[]>([
    { id: 's1', color: '#667eea', position: 0 },
    { id: 's2', color: '#764ba2', position: 100 },
  ]);
  const [isCopied, setIsCopied] = useState(false);

  const gradientCss = useMemo(() => {
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    const stopsStr = sorted.map((s) => `${s.color} ${s.position}%`).join(', ');
    if (type === 'linear') return `linear-gradient(${angle}deg, ${stopsStr})`;
    if (type === 'radial') return `radial-gradient(circle, ${stopsStr})`;
    return `conic-gradient(from ${angle}deg, ${stopsStr})`;
  }, [type, angle, stops]);

  const fullCss = `background: ${gradientCss};`;

  const addStop = () => {
    const lastPos = stops[stops.length - 1]?.position || 100;
    setStops([...stops, { id: `s${Date.now()}`, color: '#ffffff', position: Math.min(lastPos + 20, 100) }]);
  };

  const updateStop = (id: string, field: keyof ColorStop, value: any) => {
    setStops(stops.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) return;
    setStops(stops.filter((s) => s.id !== id));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullCss);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
    onRecordUsage();
  };

  const applyPreset = (css: string) => {
    // 解析预设
    if (css.startsWith('linear-gradient')) {
      setType('linear');
      const angleMatch = css.match(/(\d+)deg/);
      if (angleMatch) setAngle(parseInt(angleMatch[1]));
    } else if (css.startsWith('conic-gradient')) {
      setType('conic');
      const angleMatch = css.match(/from\s+(\d+)deg/);
      if (angleMatch) setAngle(parseInt(angleMatch[1]));
    } else if (css.startsWith('radial-gradient')) {
      setType('radial');
    }
    // 解析颜色断点
    const stopMatches = [...css.matchAll(/(#[0-9a-fA-F]{3,8})\s*(\d+)?%/g)];
    if (stopMatches.length > 0) {
      const newStops: ColorStop[] = stopMatches.map((m, i) => ({
        id: `s${Date.now()}_${i}`,
        color: m[1],
        position: m[2] ? parseInt(m[2]) : Math.round((i / (stopMatches.length - 1)) * 100),
      }));
      setStops(newStops);
    }
    onRecordUsage();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 左侧预览 */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Icon name="Palette" size={14} />
              渐变预览
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{type}</span>
          </div>
          <div
            className="h-[280px] w-full transition-all"
            style={{ background: gradientCss }}
          />
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              <code className="text-[11px] font-mono text-slate-700 flex-1 truncate">{fullCss}</code>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 font-bold text-[10px] py-1.5 px-2.5 rounded-md border transition-all cursor-pointer shrink-0 ${
                  isCopied ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-700 border-slate-200 shadow-2xs'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={11} />
                {isCopied ? '已复制' : '复制 CSS'}
              </button>
            </div>
          </div>
        </div>

        {/* 预设 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
              <Icon name="Sparkles" size={14} />
              预设方案
            </span>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p.css)}
                className="group flex flex-col gap-1 cursor-pointer"
              >
                <div
                  className="h-16 rounded-md border border-slate-200 group-hover:border-slate-400 transition-all"
                  style={{ background: p.css }}
                />
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧控制 */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Icon name="Sliders" size={16} />
            配置
          </h4>

          {/* 类型 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">渐变类型</label>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
              {(['linear', 'radial', 'conic'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 text-[11px] font-bold py-1.5 rounded transition-all cursor-pointer ${
                    type === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  {t === 'linear' ? '线性' : t === 'radial' ? '径向' : '锥形'}
                </button>
              ))}
            </div>
          </div>

          {/* 角度 */}
          {(type === 'linear' || type === 'conic') && (
            <div>
              <label className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <span>角度</span>
                <span className="text-slate-400 font-mono">{angle}°</span>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value))}
                className="w-full accent-slate-900"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                <span>0°</span><span>90°</span><span>180°</span><span>270°</span><span>360°</span>
              </div>
            </div>
          )}

          {/* 颜色断点 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">颜色断点</label>
              <button
                onClick={addStop}
                className="text-[10px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
              >
                <Icon name="Plus" size={10} /> 新增
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {stops.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={s.color}
                    onChange={(e) => updateStop(s.id, 'color', e.target.value)}
                    className="h-8 w-10 rounded border border-slate-200 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={s.color}
                    onChange={(e) => updateStop(s.id, 'color', e.target.value)}
                    className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={s.position}
                    onChange={(e) => updateStop(s.id, 'position', parseInt(e.target.value) || 0)}
                    className="w-14 text-[11px] bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 font-mono text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                  <span className="text-[10px] text-slate-400">%</span>
                  <button
                    onClick={() => removeStop(s.id)}
                    disabled={stops.length <= 2}
                    className="text-slate-400 hover:text-red-600 p-1 disabled:opacity-30 cursor-pointer"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-md border border-slate-200 leading-relaxed">
          <strong>支持:</strong> linear / radial / conic 三种渐变,多色断点、角度调节、8 种预设。一键复制 CSS。
        </div>
      </div>
    </div>
  );
};
