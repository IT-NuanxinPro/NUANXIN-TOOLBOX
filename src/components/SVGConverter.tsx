import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

const DEMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
  </defs>

  <circle cx="50" cy="50" r="45" fill="url(#glow)" />
  <circle cx="50" cy="50" r="40" fill="none" stroke="#e0e7ff" stroke-width="1.5" />
  <circle cx="50" cy="50" r="38" fill="none" stroke="#818cf8" stroke-width="0.75" stroke-dasharray="4 2" />

  <path d="M50,22 C57,22 70,25 70,25 C70,25 73,50 64,66 C57,78 50,82 50,82 C50,82 43,78 36,66 C27,50 30,25 30,25 C30,25 43,22 50,22 Z" 
        fill="url(#shieldGrad)" 
        stroke="#ffffff" 
        stroke-width="1.5" />

  <path d="M50,28 L50,75" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.3" />
  <circle cx="50" cy="50" r="24" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.2" />

  <path d="M52,34 L40,50 L49,50 L46,68 L60,48 L50,48 Z" 
        fill="#f59e0b" 
        stroke="#ffffff" 
        stroke-width="1" 
        stroke-linejoin="round" />
</svg>`;

export const SVGConverter: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [svgCode, setSvgCode] = useState<string>(DEMO_SVG);
  const [width, setWidth] = useState<number>(256);
  const [height, setHeight] = useState<number>(256);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [customBgColor, setCustomBgColor] = useState<string>('#ffffff');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp' | 'svg'>('png');
  const [fileName, setFileName] = useState<string>('vector_export');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [renderGrid, setRenderGrid] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [hasSanitizedScripts, setHasSanitizedScripts] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse SVG dimensions when code changes
  useEffect(() => {
    if (!svgCode.trim()) {
      setParseError('请输入或上传 SVG 代码');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgCode, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        setParseError('SVG 语法格式不正确，请检查是否完整闭合。');
        return;
      }

      const svgEl = doc.querySelector('svg');
      if (!svgEl) {
        setParseError('未找到有效的 <svg> 标签');
        return;
      }

      // Check for security: scripts and event handlers
      const scripts = svgEl.getElementsByTagName('script');
      let foundScripts = scripts.length > 0;
      let foundOnAttrs = false;
      const allElements = svgEl.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        for (let j = 0; j < el.attributes.length; j++) {
          if (el.attributes[j].name.startsWith('on')) {
            foundOnAttrs = true;
            break;
          }
        }
        if (foundOnAttrs) break;
      }

      setHasSanitizedScripts(foundScripts || foundOnAttrs);

      // Extract dimensions
      const widthAttr = svgEl.getAttribute('width');
      const heightAttr = svgEl.getAttribute('height');
      const viewBoxAttr = svgEl.getAttribute('viewBox');

      let parsedWidth = 256;
      let parsedHeight = 256;

      if (widthAttr && !isNaN(parseFloat(widthAttr))) {
        parsedWidth = parseFloat(widthAttr);
      }
      if (heightAttr && !isNaN(parseFloat(heightAttr))) {
        parsedHeight = parseFloat(heightAttr);
      }

      if (viewBoxAttr) {
        const parts = viewBoxAttr.split(/[\s,]+/).filter(Boolean);
        if (parts.length === 4) {
          const vbWidth = parseFloat(parts[2]);
          const vbHeight = parseFloat(parts[3]);
          if (!isNaN(vbWidth) && !isNaN(vbHeight)) {
            if (!widthAttr) parsedWidth = vbWidth;
            if (!heightAttr) parsedHeight = vbHeight;
          }
        }
      }

      setParseError(null);
      setWidth(Math.round(parsedWidth));
      setHeight(Math.round(parsedHeight));
      
      const ratio = parsedWidth > 0 ? parsedHeight / parsedWidth : 1;
      setAspectRatio(ratio);

    } catch (err: any) {
      setParseError('解析失败: ' + err.message);
    }
  }, [svgCode]);

  // Dimension Change Handlers
  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainAspectRatio && aspectRatio > 0) {
      setHeight(Math.round(val * aspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainAspectRatio && aspectRatio > 0) {
      setWidth(Math.round(val / aspectRatio));
    }
  };

  // Safe SVG sanitize and clean function
  const sanitizeSvgText = (text: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) return text;

      // 1. Remove script tags
      const scripts = svgEl.getElementsByTagName('script');
      while (scripts.length > 0) {
        scripts[0].parentNode?.removeChild(scripts[0]);
      }

      // 2. Remove event attributes (onclick, onload, etc.)
      const allElements = svgEl.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const attributes = Array.from(el.attributes);
        for (const attr of attributes) {
          if (attr.name.toLowerCase().startsWith('on')) {
            el.removeAttribute(attr.name);
          }
        }
      }

      const serializer = new XMLSerializer();
      return serializer.serializeToString(doc);
    } catch {
      return text;
    }
  };

  // Clipboard copies
  const handleCopy = () => {
    const cleanCode = sanitizeSvgText(svgCode);
    navigator.clipboard.writeText(cleanCode).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onRecordUsage();
    });
  };

  // Trigger File Download
  const triggerDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert and Download
  const handleExport = async () => {
    if (!svgCode.trim() || parseError) return;

    setIsExporting(true);
    try {
      // 1. Sanitize SVG string
      const sanitizedSvgString = sanitizeSvgText(svgCode);

      // 2. Compute final sizes
      const exportW = width * scale;
      const exportH = height * scale;

      // 3. Inject explicit width/height into SVG tag to guarantee correct canvas drawing size
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedSvgString, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      if (!svgEl) throw new Error('无效的 SVG 标签结构');

      svgEl.setAttribute('width', exportW.toString());
      svgEl.setAttribute('height', exportH.toString());
      
      // Setup viewBox if none exists so browser scales appropriately
      if (!svgEl.getAttribute('viewBox')) {
        svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
      }

      const serializer = new XMLSerializer();
      const modifiedSvgString = serializer.serializeToString(doc);

      // Direct SVG Export
      if (exportFormat === 'svg') {
        const blob = new Blob([modifiedSvgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${fileName}.svg`);
        URL.revokeObjectURL(url);
        setIsExporting(false);
        onRecordUsage();
        return;
      }

      // Canvas Rasterization (PNG / JPG / WEBP)
      const blob = new Blob([modifiedSvgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      
      // Required for CORS and security
      img.crossOrigin = 'anonymous';
      img.src = url;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Canvas 绘制图像解析失败'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = exportW;
      canvas.height = exportH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法初始化 Canvas context');

      // Fill background
      let finalBg = bgColor;
      if (bgColor === 'custom') {
        finalBg = customBgColor;
      }

      // JPG does not support transparent bg, fallback to white (or custom color)
      if (exportFormat === 'jpg') {
        ctx.fillStyle = finalBg === 'transparent' ? '#ffffff' : finalBg;
        ctx.fillRect(0, 0, exportW, exportH);
      } else if (finalBg !== 'transparent') {
        ctx.fillStyle = finalBg;
        ctx.fillRect(0, 0, exportW, exportH);
      }

      // Draw SVG onto canvas
      ctx.drawImage(img, 0, 0, exportW, exportH);
      
      // Clean up resources
      URL.revokeObjectURL(url);

      // Map formats
      let mimeType = 'image/png';
      let fileExt = 'png';
      if (exportFormat === 'jpg') {
        mimeType = 'image/jpeg';
        fileExt = 'jpg';
      } else if (exportFormat === 'webp') {
        mimeType = 'image/webp';
        fileExt = 'webp';
      }

      canvas.toBlob((canvasBlob) => {
        if (canvasBlob) {
          const downloadUrl = URL.createObjectURL(canvasBlob);
          triggerDownload(downloadUrl, `${fileName}.${fileExt}`);
          URL.revokeObjectURL(downloadUrl);
          setIsExporting(false);
          onRecordUsage();
        } else {
          throw new Error('Canvas 转换为 Blob 失败');
        }
      }, mimeType, 0.95);

    } catch (err: any) {
      setParseError('图片转换与导出失败：' + err.message);
      setIsExporting(false);
    }
  };

  // File Upload Handlers
  const processFile = (file: File) => {
    if (file && file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          setSvgCode(e.target.result);
          const rawName = file.name.replace(/\.[^/.]+$/, "");
          setFileName(`${rawName}_export`);
        }
      };
      reader.readAsText(file);
    } else {
      setParseError('仅支持上传以 .svg 结尾的矢量图文件');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Load sample demo
  const handleLoadDemo = () => {
    setSvgCode(DEMO_SVG);
    setFileName('shield_badge_export');
    setParseError(null);
  };

  // Safe preview URL
  const previewSvgBlobUrl = () => {
    if (parseError || !svgCode.trim()) return '';
    try {
      const sanitized = sanitizeSvgText(svgCode);
      const blob = new Blob([sanitized], { type: 'image/svg+xml;charset=utf-8' });
      return URL.createObjectURL(blob);
    } catch {
      return '';
    }
  };

  const [previewUrl, setPreviewUrl] = useState<string>('');
  useEffect(() => {
    const url = previewSvgBlobUrl();
    if (url) {
      setPreviewUrl(url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [svgCode, parseError]);

  return (
    <div id="svg-converter-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Code Input & Import Panel (Left) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="FileCode" size={16} />
              </span>
              <h3 className="font-semibold text-slate-900 text-sm">SVG 源代码 / 文件导入</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadDemo}
                className="text-xs text-slate-800 hover:text-slate-950 font-bold px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1 border border-transparent hover:border-slate-200"
              >
                <Icon name="Sparkles" size={12} />
                载入精美示例
              </button>
              <button
                onClick={() => {
                  setSvgCode('');
                  setFileName('vector_export');
                }}
                className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                title="清空"
              >
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          </div>

          {/* Drag and Drop Zone & Textarea */}
          <div 
            className={`relative p-5 transition-all ${
              dragActive ? 'bg-slate-50/50 ring-2 ring-slate-900 ring-dashed' : ''
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {/* Overlay prompt when dragging file */}
            {dragActive && (
              <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="p-4 bg-white rounded-full shadow-lg text-slate-800 animate-bounce">
                  <Icon name="Upload" size={32} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-950">松开鼠标即可载入 SVG</p>
              </div>
            )}

            {/* Inner upload button */}
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
              <span>在下方框中粘贴 XML 代码，或直接拖拽文件到此：</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-slate-950 py-1 px-2.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer border border-slate-300"
              >
                <Icon name="Upload" size={12} />
                上传 .svg 文件
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".svg,image/svg+xml"
                className="hidden"
              />
            </div>

            <textarea
              value={svgCode}
              onChange={(e) => setSvgCode(e.target.value)}
              placeholder="请在此处粘贴 <svg>...</svg> 代码..."
              className="w-full h-[380px] font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 outline-hidden focus:ring-2 focus:ring-black/20 focus:border-black resize-none leading-relaxed transition-all"
            />
            
            {hasSanitizedScripts && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-md p-2.5 border border-amber-100 flex items-start gap-2">
                <Icon name="AlertTriangle" className="shrink-0 mt-0.5 text-amber-600" size={14} />
                <div>
                  <span className="font-semibold">隐私安全警示：</span>
                  检测到代码包含外部脚本 (Script) 或事件。系统已在本地沙箱中将其彻底清理过滤，保障浏览器运行安全，所有外部请求与动态逻辑已被屏蔽。
                </div>
              </div>
            )}
            
            {parseError && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-md p-2.5 border border-red-100 flex items-center gap-2">
                <Icon name="AlertTriangle" className="shrink-0 text-red-500" size={14} />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Quick Stats & Action footer */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div className="flex gap-4">
              <span>大小: <strong className="text-slate-700 font-semibold">{Math.round(svgCode.length / 1024 * 100) / 100} KB</strong></span>
              <span>行数: <strong className="text-slate-700 font-semibold">{svgCode.split('\n').length} 行</strong></span>
            </div>
            
            <button
              onClick={handleCopy}
              disabled={!svgCode.trim() || !!parseError}
              className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
                isCopied 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              <Icon name={isCopied ? 'Check' : 'Copy'} size={12} />
              {isCopied ? '已复制清洗后的SVG' : '复制规范化代码'}
            </button>
          </div>
        </div>
      </div>

      {/* Render Preview & Settings Panel (Right) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Preview Area */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
              <Icon name="Eye" className="text-slate-500" size={16} />
              实时高保真预览
            </h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={renderGrid}
                  onChange={(e) => setRenderGrid(e.target.checked)}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                />
                透明网格网
              </label>
            </div>
          </div>

          <div className="p-8 flex items-center justify-center bg-slate-50 min-h-[280px] relative">
            {/* Checkerboard Pattern for transparent background */}
            {renderGrid && (
              <div 
                className="absolute inset-0 pointer-events-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAADhJREFUKFNjZGBgYJgxY8Z/SkoKSTB8+HByMT4+PqYpKCgkZ2RkZGBmZmb4//8/AxZ1mGqYaiRGAOonBAt66OshAAAAAElFTkSuQmCC')] opacity-40 shadow-inner"
              />
            )}
            
            {/* Real Graphic */}
            <div 
              className="relative rounded-lg shadow-sm border border-slate-200 flex items-center justify-center transition-all overflow-hidden"
              style={{
                width: width > 240 ? 240 : width < 60 ? 60 : width,
                height: height > 240 ? 240 : height < 60 ? 60 : height,
                backgroundColor: bgColor === 'transparent' ? 'transparent' : (bgColor === 'custom' ? customBgColor : bgColor),
              }}
            >
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="SVG Preview" 
                  className="max-w-full max-h-full object-contain pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center text-xs text-slate-400 p-4">
                  等待载入合规代码
                </div>
              )}
            </div>
            
            {/* Image Info Overlay */}
            <div className="absolute bottom-2 right-3 text-[10px] text-slate-500 font-mono bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-100">
              视口: {width} × {height}
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
              <Icon name="Sliders" className="text-slate-900" size={16} />
              导出及调整参数
            </h4>
          </div>

          {/* Dimensions Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">目标宽度 (px)</label>
              <input
                type="number"
                value={width || ''}
                min={1}
                max={4096}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">目标高度 (px)</label>
              <input
                type="number"
                value={height || ''}
                min={1}
                max={4096}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200">
            <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={maintainAspectRatio}
                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
              />
              锁定原始比例 ({aspectRatio ? (1 / aspectRatio).toFixed(2) : '1'}:1)
            </label>
          </div>

          {/* Scale Multipliers */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">渲染倍率 (提高分辨率)</label>
            <div className="grid grid-cols-5 gap-1.5 bg-slate-100 p-1 rounded-md">
              {[1, 1.5, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`text-[11px] py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                    scale === s
                      ? 'bg-white text-slate-950 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-950'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              高倍率将生成高清精细图。当前实际导出尺寸: <strong className="font-mono text-slate-600 font-semibold">{Math.round(width * scale)} × {Math.round(height * scale)} px</strong>
            </p>
          </div>

          {/* Background Colors */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">背景设置</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '透明', value: 'transparent' },
                { label: '白色', value: '#ffffff' },
                { label: '黑色', value: '#000000' },
                { label: '灰色', value: '#f1f5f9' },
                { label: '自定义', value: 'custom' },
              ].map((bg) => (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => setBgColor(bg.value)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border font-semibold transition-all cursor-pointer ${
                    bgColor === bg.value
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>

            {bgColor === 'custom' && (
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer overflow-hidden p-0"
                />
                <input
                  type="text"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  placeholder="#ffffff"
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-mono w-28 text-slate-800"
                />
              </div>
            )}
            
            {exportFormat === 'jpg' && bgColor === 'transparent' && (
              <p className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 rounded-md p-1.5 border border-amber-100">
                提示: JPG 格式不支持透明通道，透明区域在导出时将自动填充为白色背景。
              </p>
            )}
          </div>

          {/* Output Format Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">导出格式</label>
            <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1 rounded-md">
              {(['png', 'jpg', 'webp', 'svg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`text-xs py-2 font-semibold rounded-md uppercase transition-all cursor-pointer ${
                    exportFormat === fmt
                      ? 'bg-white text-slate-950 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-950'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Export File Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">导出文件名</label>
            <div className="flex gap-1 items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 focus-within:ring-1 focus-within:ring-black focus-within:border-black">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value.replace(/[^a-zA-Z0-9_\-]/g, ''))}
                placeholder="vector_export"
                className="w-full text-xs bg-transparent border-0 outline-hidden p-0 focus:ring-0 text-slate-800"
              />
              <span className="text-xs font-mono text-slate-400 select-none">.{exportFormat === 'jpg' ? 'jpg' : exportFormat}</span>
            </div>
          </div>

          {/* Submit Trigger */}
          <button
            onClick={handleExport}
            disabled={isExporting || !svgCode.trim() || !!parseError}
            className="w-full mt-2 cursor-pointer bg-slate-900 hover:bg-slate-950 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold py-2.5 rounded-md transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在本地渲染并打包...
              </>
            ) : (
              <>
                <Icon name="Download" size={16} />
                安全导出到本地文件夹
              </>
            )}
          </button>

          <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 mt-1">
            <Icon name="ShieldCheck" className="text-emerald-500" size={12} />
            <span>完全基于客户端 Canvas 构建，承诺绝不上传任何代码至云端</span>
          </div>

        </div>

      </div>

    </div>
  );
};
