import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

// Color utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, c)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r = l;
  let g = l;
  let b = l;

  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Generate shade colors
function generateShades(hex: string): { grade: number; hex: string }[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const grades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  return grades.map((g, idx) => {
    // scale lightness: 50 is lighter (e.g. 96% lightness), 950 is darker (e.g. 8% lightness)
    let targetL = hsl.l;
    if (g <= 400) {
      // make lighter
      const diff = 96 - hsl.l;
      targetL = hsl.l + diff * ((500 - g) / 500);
    } else if (g > 500) {
      // make darker
      const diff = hsl.l - 8;
      targetL = hsl.l - diff * ((g - 500) / 500);
    }
    const targetRgb = hslToRgb(hsl.h, hsl.s, targetL);
    return {
      grade: g,
      hex: rgbToHex(targetRgb.r, targetRgb.g, targetRgb.b),
    };
  });
}

const TAILWIND_PALETTES = [
  { name: 'Slate', color: '#64748b' },
  { name: 'Gray', color: '#6b7280' },
  { name: 'Zinc', color: '#71717a' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Teal', color: '#0d9488' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Fuchsia', color: '#d946ef' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Rose', color: '#f43f5e' },
];

export const ColorBox: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [hexColor, setHexColor] = useState<string>('#3b82f6');
  const [rgbColor, setRgbColor] = useState<{ r: number; g: number; b: number }>({ r: 59, g: 130, b: 246 });
  const [hslColor, setHslColor] = useState<{ h: number; s: number; l: number }>({ h: 217, s: 91, l: 60 });
  
  const [manualInput, setManualInput] = useState<string>('#3b82f6');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sync state when color picker or manual color changes
  useEffect(() => {
    const rgb = hexToRgb(hexColor);
    if (rgb) {
      setRgbColor(rgb);
      setHslColor(rgbToHsl(rgb.r, rgb.g, rgb.b));
    }
  }, [hexColor]);

  const handleManualSubmit = (val: string) => {
    setManualInput(val);
    let clean = val.trim();
    if (clean.startsWith('rgb')) {
      const match = clean.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        const hex = rgbToHex(r, g, b);
        setHexColor(hex);
      }
    } else {
      if (!clean.startsWith('#')) {
        clean = '#' + clean;
      }
      if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
        setHexColor(clean);
      }
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 1500);
    onRecordUsage();
  };

  const shades = generateShades(hexColor);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      
      {/* Selector & Converter Panel (Left) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5 h-full">
          <div className="border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
            <Icon name="Palette" className="text-slate-900" size={16} />
            <h4 className="font-bold text-slate-900 text-sm">色彩转换与调色板</h4>
          </div>

          {/* Color pickers */}
          <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-md border border-slate-100">
            <div className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 shrink-0">
              <input
                type="color"
                value={hexColor}
                onChange={(e) => {
                  setHexColor(e.target.value);
                  setManualInput(e.target.value);
                }}
                className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">输入/选择颜色 (HEX 或 RGB)</label>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => handleManualSubmit(e.target.value)}
                placeholder="#3b82f6 或 rgb(59, 130, 246)"
                className="w-full text-xs font-mono bg-white border border-slate-200 rounded-md px-3 py-1.5 font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Formatted Outputs */}
          <div className="flex flex-col gap-3 pt-2">
            
            {/* Hex format */}
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-md p-2.5">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 leading-none mb-1">HEX 格式</span>
                <span className="font-mono text-xs font-bold text-slate-800">{hexColor.toUpperCase()}</span>
              </div>
              <button
                onClick={() => handleCopy(hexColor.toUpperCase(), 'hex')}
                className="text-xs font-bold border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1 px-2.5 rounded-md cursor-pointer transition-colors shadow-2xs"
              >
                {copiedText === 'hex' ? '已复制' : '复制'}
              </button>
            </div>

            {/* RGB format */}
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-md p-2.5">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 leading-none mb-1">RGB 格式</span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  rgb({rgbColor.r}, {rgbColor.g}, {rgbColor.b})
                </span>
              </div>
              <button
                onClick={() => handleCopy(`rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`, 'rgb')}
                className="text-xs font-bold border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1 px-2.5 rounded-md cursor-pointer transition-colors shadow-2xs"
              >
                {copiedText === 'rgb' ? '已复制' : '复制'}
              </button>
            </div>

            {/* HSL format */}
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-md p-2.5">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 leading-none mb-1">HSL 格式</span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  hsl({hslColor.h}, {hslColor.s}%, {hslColor.l}%)
                </span>
              </div>
              <button
                onClick={() => handleCopy(`hsl(${hslColor.h}, ${hslColor.s}%, ${hslColor.l}%)`, 'hsl')}
                className="text-xs font-bold border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1 px-2.5 rounded-md cursor-pointer transition-colors shadow-2xs"
              >
                {copiedText === 'hsl' ? '已复制' : '复制'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Shades & Tailwind presets (Right) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Dynamic Shades */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-800" />
            自动生成的全阶阴影渐变色组 (Shades Range)
          </h5>

          <div className="flex flex-col gap-1.5">
            {shades.map((shade) => (
              <div
                key={shade.grade}
                onClick={() => {
                  setHexColor(shade.hex);
                  setManualInput(shade.hex);
                }}
                className="flex items-center justify-between p-2 rounded-md border border-slate-100/60 cursor-pointer hover:scale-[1.01] active:scale-100 transition-all"
                style={{ backgroundColor: `${shade.hex}11` }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-5 h-5 rounded-sm border border-slate-200 shrink-0 shadow-2xs"
                    style={{ backgroundColor: shade.hex }}
                  />
                  <span className="text-xs font-bold text-slate-800 w-8 font-mono">{shade.grade}</span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">{shade.hex.toUpperCase()}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(shade.hex.toUpperCase(), `sh-${shade.grade}`);
                  }}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-900 border border-slate-200 bg-white px-2 py-0.5 rounded shadow-2xs cursor-pointer"
                >
                  {copiedText === `sh-${shade.grade}` ? '已复制' : '复制 HEX'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tailwind Palettes List */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-900" />
            Tailwind UI 标准调色板速查
          </h5>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TAILWIND_PALETTES.map((pal) => (
              <button
                key={pal.name}
                onClick={() => {
                  setHexColor(pal.color);
                  setManualInput(pal.color);
                }}
                className="flex items-center gap-2 p-1.5 rounded-md border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-left cursor-pointer transition-all hover:scale-[1.02]"
              >
                <div
                  className="w-4 h-4 rounded-sm border border-slate-200 shadow-2xs shrink-0"
                  style={{ backgroundColor: pal.color }}
                />
                <div className="truncate">
                  <span className="block text-[10px] font-bold text-slate-700 leading-tight">{pal.name}</span>
                  <span className="block text-[9px] font-mono text-slate-400 font-bold leading-none">{pal.color.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
