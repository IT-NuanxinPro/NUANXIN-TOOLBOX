import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

type Unit = 'px' | 'rem' | 'em' | 'vw' | 'vh' | 'pt' | 'pc' | 'cm' | 'mm' | 'in' | '%';

const UNIT_LABEL: Record<Unit, string> = {
  px: 'px (像素)',
  rem: 'rem (根元素相对)',
  em: 'em (父元素相对)',
  vw: 'vw (视口宽度%)',
  vh: 'vh (视口高度%)',
  pt: 'pt (磅)',
  pc: 'pc (Pica)',
  cm: 'cm (厘米)',
  mm: 'mm (毫米)',
  in: 'in (英寸)',
  '%': '% (百分比)',
};

const UNITS: Unit[] = ['px', 'rem', 'em', 'vw', 'vh', 'pt', 'pc', 'cm', 'mm', 'in', '%'];

export const CssUnitConverter: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [value, setValue] = useState('16');
  const [fromUnit, setFromUnit] = useState<Unit>('px');
  const [rootFontSize, setRootFontSize] = useState('16');
  const [viewportWidth, setViewportWidth] = useState('1920');
  const [viewportHeight, setViewportHeight] = useState('1080');
  const [parentFontSize, setParentFontSize] = useState('16');
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // 以 px 为基准单位进行换算
  const toPx = useMemo(() => {
    const v = parseFloat(value);
    if (isNaN(v)) return null;
    const root = parseFloat(rootFontSize) || 16;
    const vw = parseFloat(viewportWidth) || 1920;
    const vh = parseFloat(viewportHeight) || 1080;
    const parent = parseFloat(parentFontSize) || 16;
    switch (fromUnit) {
      case 'px': return v;
      case 'rem': return v * root;
      case 'em': return v * parent;
      case 'vw': return (v / 100) * vw;
      case 'vh': return (v / 100) * vh;
      case 'pt': return v * (96 / 72);
      case 'pc': return v * 12 * (96 / 72);
      case 'cm': return v * (96 / 2.54);
      case 'mm': return v * (96 / 2.54) / 10;
      case 'in': return v * 96;
      case '%': return (v / 100) * parent;
      default: return null;
    }
  }, [value, fromUnit, rootFontSize, viewportWidth, viewportHeight, parentFontSize]);

  const converted = useMemo(() => {
    if (toPx === null) return null;
    const root = parseFloat(rootFontSize) || 16;
    const vw = parseFloat(viewportWidth) || 1920;
    const vh = parseFloat(viewportHeight) || 1080;
    const parent = parseFloat(parentFontSize) || 16;
    const map: Record<Unit, number> = {
      px: toPx,
      rem: toPx / root,
      em: toPx / parent,
      vw: (toPx / vw) * 100,
      vh: (toPx / vh) * 100,
      pt: toPx / (96 / 72),
      pc: toPx / (12 * (96 / 72)),
      cm: toPx / (96 / 2.54),
      mm: toPx / ((96 / 2.54) / 10),
      in: toPx / 96,
      '%': (toPx / parent) * 100,
    };
    return map;
  }, [toPx, rootFontSize, viewportWidth, viewportHeight, parentFontSize]);

  const handleCopy = (u: Unit, v: number) => {
    const text = `${Number(v.toFixed(4))}${u}`;
    navigator.clipboard.writeText(text);
    setIsCopied(u);
    setTimeout(() => setIsCopied(null), 1500);
    onRecordUsage();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 左侧控制面板 */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Icon name="Sliders" size={16} />
            基准参数
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">输入值</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700"
                placeholder="16"
              />
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value as Unit)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700 cursor-pointer"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">根字号 (rem基准)</label>
              <input
                type="number"
                value={rootFontSize}
                onChange={(e) => setRootFontSize(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">父级字号 (em基准)</label>
              <input
                type="number"
                value={parentFontSize}
                onChange={(e) => setParentFontSize(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">视口宽度 px</label>
              <input
                type="number"
                value={viewportWidth}
                onChange={(e) => setViewportWidth(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">视口高度 px</label>
              <input
                type="number"
                value={viewportHeight}
                onChange={(e) => setViewportHeight(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700"
              />
            </div>
          </div>

          {toPx !== null && (
            <div className="bg-slate-900 text-white rounded-md p-3 mt-1">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">换算基准</div>
              <div className="font-mono text-lg font-bold">{toPx.toFixed(2)} <span className="text-slate-400 text-sm">px</span></div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧结果 */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Ruler" size={16} />
              </span>
              <span className="font-semibold text-slate-900 text-sm">全部换算结果</span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">{value}{fromUnit} → 所有单位</span>
          </div>

          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
            {converted && UNITS.map((u) => {
              const v = converted[u];
              const isCurrent = u === fromUnit;
              return (
                <button
                  key={u}
                  onClick={() => handleCopy(u, v)}
                  className={`text-left p-3 rounded-md border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-slate-900 border-slate-950 text-white'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                    {UNIT_LABEL[u]}
                  </div>
                  <div className={`font-mono text-lg font-bold ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                    {Number(v.toFixed(4))}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${isCopied === u ? 'text-emerald-400 font-bold' : isCurrent ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isCopied === u ? '已复制' : '点击复制'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 leading-relaxed">
            <strong>换算公式 (基于 96 DPI):</strong> 1in = 96px · 1cm = 37.8px · 1mm = 3.78px · 1pt = 1.333px · 1pc = 16px
          </div>
        </div>
      </div>
    </div>
  );
};
