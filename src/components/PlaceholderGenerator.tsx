import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface PlaceholderGeneratorProps {
  onRecordUsage: () => void;
}

export const PlaceholderGenerator: React.FC<PlaceholderGeneratorProps> = ({ onRecordUsage }) => {
  const [width, setWidth] = useState<number>(300);
  const [height, setHeight] = useState<number>(200);
  const [labelText, setLabelText] = useState<string>('');
  const [backgroundColor, setBackgroundColor] = useState<string>('#e2e8f0'); // slate-200
  const [textColor, setTextColor] = useState<string>('#475569'); // slate-600
  const [svgContent, setSvgContent] = useState<string>('');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'url' | 'tag' | 'svg' | null>(null);

  useEffect(() => {
    generatePlaceholder();
  }, [width, height, labelText, backgroundColor, textColor]);

  const generatePlaceholder = () => {
    const textToShow = labelText.trim() || `${width} x ${height}`;
    
    // Generate inline SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${backgroundColor}" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', -apple-system, sans-serif" font-weight="bold" font-size="${Math.max(12, Math.min(width, height) / 10)}px" fill="${textColor}">
    ${textToShow}
  </text>
</svg>`;

    setSvgContent(svg);
    // Convert to Data URL
    const encodedSvg = encodeURIComponent(svg)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22");
    setDataUrl(`data:image/svg+xml;utf8,${encodedSvg}`);
  };

  const handleDownload = () => {
    onRecordUsage();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `placeholder_${width}x${height}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (type: 'url' | 'tag' | 'svg') => {
    onRecordUsage();
    let textToCopy = '';
    if (type === 'url') {
      textToCopy = dataUrl;
    } else if (type === 'tag') {
      textToCopy = `<img src="${dataUrl}" alt="Placeholder" />`;
    } else {
      textToCopy = svgContent;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedType(type);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
      setCopiedType(null);
    }, 2000);
  };

  const COLOR_PRESETS = [
    { name: '极简灰色', bg: '#f1f5f9', fg: '#64748b' },
    { name: '曜石深邃', bg: '#1e293b', fg: '#f8fafc' },
    { name: '温暖杏咖', bg: '#faf8f5', fg: '#7c2d12' },
    { name: '墨绿松针', bg: '#064e3b', fg: '#ecfdf5' },
    { name: '淡雅薰衣草', bg: '#f5f3ff', fg: '#6d28d9' },
  ];

  return (
    <div id="placeholder-generator-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Parameter inputs - Left */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Sliders" className="text-slate-900" size={16} />
          占位图外观设置
        </h4>

        {/* Width & Height */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">宽度 (Width - px)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Math.max(10, parseInt(e.target.value) || 100))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">高度 (Height - px)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Math.max(10, parseInt(e.target.value) || 100))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Text */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">自定义文本标签 (Label)</label>
          <input
            type="text"
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            placeholder={`默认: ${width} x ${height}`}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-semibold text-slate-800"
          />
        </div>

        {/* Custom colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">背景填充色 (Fill)</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer p-0"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-md py-1 px-1.5 font-bold text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">文字标签色 (Text)</label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer p-0"
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-md py-1 px-1.5 font-bold text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Color Presets */}
        <div className="flex flex-col gap-2 mt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">推荐经典配色</span>
          <div className="flex flex-col gap-1.5">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setBackgroundColor(p.bg);
                  setTextColor(p.fg);
                  onRecordUsage();
                }}
                className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-all"
              >
                <span className="font-semibold text-slate-700">{p.name}</span>
                <div className="flex gap-1 items-center">
                  <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: p.bg }} />
                  <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: p.fg }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output preview - Right */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Image" size={16} />
              </span>
              SVG 占位图渲染
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDownload}
                className="text-xs bg-slate-900 hover:bg-slate-950 text-white font-bold px-3 py-1.5 rounded-md transition-all flex items-center gap-1 cursor-pointer"
              >
                <Icon name="Download" size={12} />
                下载 SVG
              </button>
            </div>
          </div>

          {/* Interactive preview */}
          <div className="flex-1 p-5 bg-slate-100/50 flex items-center justify-center min-h-[220px]">
            {dataUrl ? (
              <div className="max-w-full max-h-[280px] p-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto">
                <img
                  src={dataUrl}
                  alt="Placeholder Preview"
                  className="max-w-full h-auto object-contain mx-auto"
                  style={{ width: `${Math.min(width, 400)}px`, height: `${Math.min(height, 280)}px` }}
                />
              </div>
            ) : (
              <span className="text-xs text-slate-400">正在生成占位图...</span>
            )}
          </div>

          {/* Copy Panel */}
          <div className="border-t border-slate-100 p-4 bg-slate-50 flex flex-col gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">前端开发一键复制段：</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleCopy('url')}
                className={`text-xs font-bold py-2 px-1 rounded-md border text-center cursor-pointer transition-all ${
                  isCopied && copiedType === 'url'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icon name={isCopied && copiedType === 'url' ? 'Check' : 'Copy'} size={11} className="inline mr-1" />
                复制 Data URL
              </button>

              <button
                onClick={() => handleCopy('tag')}
                className={`text-xs font-bold py-2 px-1 rounded-md border text-center cursor-pointer transition-all ${
                  isCopied && copiedType === 'tag'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icon name={isCopied && copiedType === 'tag' ? 'Check' : 'Copy'} size={11} className="inline mr-1" />
                复制 &lt;img&gt; 标签
              </button>

              <button
                onClick={() => handleCopy('svg')}
                className={`text-xs font-bold py-2 px-1 rounded-md border text-center cursor-pointer transition-all ${
                  isCopied && copiedType === 'svg'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icon name={isCopied && copiedType === 'svg' ? 'Check' : 'Copy'} size={11} className="inline mr-1" />
                复制 SVG 代码
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
