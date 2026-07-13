import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Icon } from './Icon';
import { useToolBridge } from '../hooks/useToolBridge';

interface QrCodeGeneratorProps {
  onRecordUsage: () => void;
}

export const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = ({ onRecordUsage }) => {
  const [text, setText] = useState<string>('https://ai.studio/build');
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [margin, setMargin] = useState<number>(4);
  const [size, setSize] = useState<number>(300);
  const [foregroundColor, setForegroundColor] = useState<string>('#000000');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { pendingTransfer, consumeTransfer } = useToolBridge('qrcode-gen');

  useEffect(() => {
    if (!pendingTransfer) return;
    setText(pendingTransfer.data);
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);

  useEffect(() => {
    generateQrCode();
  }, [text, errorCorrectionLevel, margin, size, foregroundColor, backgroundColor]);

  const generateQrCode = async () => {
    if (!text.trim()) {
      setQrDataUrl('');
      return;
    }
    try {
      const options: QRCode.QRCodeToDataURLOptions = {
        errorCorrectionLevel,
        margin,
        width: size,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
      };

      const url = await QRCode.toDataURL(text, options);
      setQrDataUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    onRecordUsage();
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    onRecordUsage();
    if (!qrDataUrl) return;
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      // Fallback
      try {
        await navigator.clipboard.writeText(qrDataUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (e) {
        console.error('Copy failed', e);
      }
    }
  };

  const PRESETS = [
    { name: '官方 AI Studio', value: 'https://ai.studio/build' },
    { name: 'WiFi 连接配置', value: 'WIFI:S:MyHomeWiFi;T:WPA;P:Password123;;' },
    { name: '电子名片 vCard', value: 'BEGIN:VCARD\nVERSION:3.0\nN:张三\nTEL:13800138000\nEND:VCARD' },
    { name: '普通文本/便签', value: '这是一条存放在二维码里的本地备忘便签，扫码即可查看。' },
  ];

  return (
    <div id="qr-code-generator-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Parameter Panel */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Sliders" className="text-slate-900" size={16} />
          二维码参数配置
        </h4>

        {/* Input Content */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600">文本或链接内容 (URL / Text)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入您想生成二维码的网址、文本、WiFi密码等..."
            rows={4}
            className="w-full text-xs bg-slate-50 border border-slate-200 p-3 rounded-xl outline-hidden focus:ring-1 focus:ring-black resize-none font-mono text-slate-700 leading-normal"
          />
        </div>

        {/* Custom Quick Presets */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">常用内容模板</span>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setText(p.value);
                  onRecordUsage();
                }}
                className="text-left p-2.5 rounded-lg border border-slate-100 hover:border-slate-400 hover:bg-slate-50 text-xs font-bold transition-all text-slate-700 cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-4">
          <span className="text-xs font-bold text-slate-900">外观与纠错配置</span>

          {/* Error correction level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">纠错等级 (ECL)</label>
              <select
                value={errorCorrectionLevel}
                onChange={(e) => setErrorCorrectionLevel(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
              >
                <option value="L">L - 约 7% 损毁恢复</option>
                <option value="M">M - 约 15% 损毁恢复</option>
                <option value="Q">Q - 约 25% 损毁恢复</option>
                <option value="H">H - 高 30% 损毁恢复 (推荐)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">白边间距 (Margin)</label>
              <select
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value) || 4)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
              >
                <option value="0">无白边 (0)</option>
                <option value="2">窄边 (2)</option>
                <option value="4">标准 (4)</option>
                <option value="6">宽边 (6)</option>
              </select>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">前景色 (斑点颜色)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-md py-1 px-1.5 font-bold text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">背景色 (底色)</label>
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
          </div>

          {/* Size */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">图片导出尺寸: {size}px x {size}px</label>
            <input
              type="range"
              min={150}
              max={600}
              step={50}
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Output Preview Panel */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="QrCode" size={16} />
              </span>
              二维码实时预览
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                disabled={!qrDataUrl}
                className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={12} className="inline mr-1" />
                {isCopied ? '已拷贝' : '拷贝图片'}
              </button>
              <button
                onClick={handleDownload}
                disabled={!qrDataUrl}
                className="text-xs bg-slate-900 hover:bg-slate-950 text-white font-bold px-3 py-1.5 rounded-md transition-all flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Icon name="Download" size={12} />
                下载 PNG 图片
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-100/50 min-h-[300px]">
            {qrDataUrl ? (
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-md transition-all hover:scale-[1.02] duration-300">
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  referrerPolicy="no-referrer"
                  className="max-w-full h-auto object-contain"
                  style={{ width: `${Math.min(size, 260)}px`, height: `${Math.min(size, 260)}px` }}
                />
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <Icon name="FileQuestion" size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">请输入文本或链接以生成二维码</p>
              </div>
            )}
          </div>
        </div>

        {/* Local storage policy */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">🔒 隐私与安全性保障：</p>
          二维码的解析与生成在您的浏览器内完全通过 Canvas 渲染，不涉及任何外部 API 的上报和传输，绝对保障您的商业链接、私密信息及 WiFi 登录密码的隐私安全。
        </div>
      </div>
    </div>
  );
};
