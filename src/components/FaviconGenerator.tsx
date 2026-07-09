import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

const SIZES = [
  { size: 16, label: '16x16', usage: '浏览器标签' },
  { size: 32, label: '32x32', usage: '标准 favicon' },
  { size: 48, label: '48x48', usage: 'Windows 图标' },
  { size: 64, label: '64x64', usage: '桌面图标' },
  { size: 180, label: '180x180', usage: 'Apple Touch Icon' },
  { size: 192, label: '192x192', usage: 'Android Chrome' },
  { size: 512, label: '512x512', usage: 'PWA 主图标' },
];

export const FaviconGenerator: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#0f172a');
  const [padding, setPadding] = useState(10);
  const [radius, setRadius] = useState(20);
  const [letter, setLetter] = useState('N');
  const [useLetter, setUseLetter] = useState(false);
  const [isCopied, setIsCopied] = useState<number | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成单尺寸 PNG dataURL
  const generatePng = (size: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 圆角矩形背景
    if (radius > 0) {
      ctx.save();
      const r = (radius / 100) * size;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(size, 0, size, size, r);
      ctx.arcTo(size, size, 0, size, r);
      ctx.arcTo(0, size, 0, 0, r);
      ctx.arcTo(0, 0, size, 0, r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    if (useLetter) {
      // 文字模式
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size * 0.6}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter || 'N', size / 2, size / 2 + size * 0.04);
    } else if (imageSrc) {
      // 图片模式
      const img = new Image();
      img.src = imageSrc;
      // 由于 Image 加载是异步的,这里用已加载的 imageSrc 同步绘制
      // 使用 crossOrigin 处理
      try {
        const p = (padding / 100) * size;
        ctx.drawImage(img, p, p, size - 2 * p, size - 2 * p);
      } catch {
        ctx.fillStyle = '#64748b';
        ctx.font = `bold ${size * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('IMG', size / 2, size / 2);
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${size * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', size / 2, size / 2);
    }
    return canvas.toDataURL('image/png');
  };

  // 缓存生成的 dataURL(异步加载图片)
  const [dataUrls, setDataUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    if (useLetter) {
      const map: Record<number, string> = {};
      SIZES.forEach((s) => { map[s.size] = generatePng(s.size); });
      setDataUrls(map);
      setLinkCode(generateLinkCode(map));
    } else if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        const map: Record<number, string> = {};
        SIZES.forEach((s) => {
          const canvas = document.createElement('canvas');
          canvas.width = s.size;
          canvas.height = s.size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          if (radius > 0) {
            const r = (radius / 100) * s.size;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.arcTo(s.size, 0, s.size, s.size, r);
            ctx.arcTo(s.size, s.size, 0, s.size, r);
            ctx.arcTo(0, s.size, 0, 0, r);
            ctx.arcTo(0, 0, s.size, 0, r);
            ctx.closePath();
            ctx.fillStyle = bgColor;
            ctx.fill();
            // 裁剪
            ctx.clip();
          } else {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, s.size, s.size);
          }
          const p = (padding / 100) * s.size;
          ctx.drawImage(img, p, p, s.size - 2 * p, s.size - 2 * p);
          map[s.size] = canvas.toDataURL('image/png');
        });
        setDataUrls(map);
        setLinkCode(generateLinkCode(map));
      };
      img.src = imageSrc;
    } else {
      setDataUrls({});
      setLinkCode('');
    }
  }, [imageSrc, bgColor, padding, radius, letter, useLetter]);

  const generateLinkCode = (map: Record<number, string>) => {
    const lines: string[] = ['<!-- Favicon 配置 -->'];
    if (map[32]) lines.push(`<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">`);
    if (map[16]) lines.push(`<link rel="icon" type="image/png" sizes="16x16" href="favicon-16.png">`);
    if (map[180]) lines.push(`<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">`);
    if (map[192]) lines.push(`<link rel="icon" type="image/png" sizes="192x192" href="android-chrome-192.png">`);
    if (map[512]) lines.push(`<link rel="icon" type="image/png" sizes="512x512" href="android-chrome-512.png">`);
    lines.push('<link rel="manifest" href="site.webmanifest">');
    return lines.join('\n');
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setUseLetter(false);
      onRecordUsage();
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDownload = (size: number) => {
    const url = dataUrls[size];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `favicon-${size}.png`;
    a.click();
    onRecordUsage();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkCode);
    setIsCopied(-1);
    setTimeout(() => setIsCopied(null), 1500);
    onRecordUsage();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 左侧控制 */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Icon name="Settings" size={16} />
            图标配置
          </h4>

          {/* 上传区 */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
          >
            {imageSrc ? (
              <img src={imageSrc} alt="预览" className="w-16 h-16 mx-auto object-contain rounded-md" />
            ) : (
              <>
                <Icon name="Upload" size={24} className="mx-auto text-slate-400 mb-1" />
                <div className="text-xs font-bold text-slate-600">点击或拖拽上传图片</div>
                <div className="text-[10px] text-slate-400 mt-0.5">PNG / JPG / SVG</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* 模式切换 */}
          <div className="flex gap-2">
            <button
              onClick={() => { setUseLetter(false); }}
              className={`flex-1 text-[10px] font-bold py-2 rounded-md transition-all cursor-pointer ${
                !useLetter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              图片模式
            </button>
            <button
              onClick={() => { setUseLetter(true); onRecordUsage(); }}
              className={`flex-1 text-[10px] font-bold py-2 rounded-md transition-all cursor-pointer ${
                useLetter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              字母模式
            </button>
          </div>

          {useLetter && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">字母 / 字符</label>
              <input
                type="text"
                maxLength={2}
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-bold text-slate-700 text-center text-lg"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">背景色</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-8 w-12 rounded border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden font-mono text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>内边距</span>
              <span className="text-slate-400">{padding}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="40"
              value={padding}
              onChange={(e) => setPadding(parseInt(e.target.value))}
              className="w-full accent-slate-900"
            />
          </div>

          <div>
            <label className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>圆角</span>
              <span className="text-slate-400">{radius}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full accent-slate-900"
            />
          </div>
        </div>
      </div>

      {/* 右侧输出 */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Image" size={16} />
              </span>
              <span className="font-semibold text-slate-900 text-sm">多尺寸输出</span>
            </div>
          </div>

          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
            {SIZES.map((s) => (
              <div key={s.size} className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col items-center gap-2">
                <div className="bg-white p-2 rounded-md border border-slate-200">
                  {dataUrls[s.size] && (
                    <img
                      src={dataUrls[s.size]}
                      alt={`${s.label}`}
                      style={{ width: Math.min(s.size, 64), height: Math.min(s.size, 64) }}
                      className="object-contain"
                    />
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-900">{s.label}</div>
                  <div className="text-[10px] text-slate-500">{s.usage}</div>
                </div>
                <button
                  onClick={() => handleDownload(s.size)}
                  disabled={!dataUrls[s.size]}
                  className="w-full text-[10px] font-bold py-1.5 rounded-md bg-slate-900 hover:bg-slate-950 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
                >
                  <Icon name="Download" size={10} />
                  下载
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* HTML link 标签代码 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Icon name="Code" size={14} />
              HTML link 标签代码
            </span>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1 font-bold text-[10px] py-1 px-2.5 rounded-md border transition-all cursor-pointer ${
                isCopied === -1 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              <Icon name={isCopied === -1 ? 'Check' : 'Copy'} size={10} />
              {isCopied === -1 ? '已复制' : '复制代码'}
            </button>
          </div>
          <pre className="p-5 text-xs font-mono text-slate-700 bg-slate-950 text-emerald-300 overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
            {linkCode || '请先选择图片或输入字母'}
          </pre>
        </div>
      </div>
    </div>
  );
};
