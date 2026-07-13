import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { useToolBridge } from '../hooks/useToolBridge';
import { ToolComponentProps } from '../types';

const looksLikeBase64Text = (value: string) => {
  const compactValue = value.replace(/\s/g, '');
  return compactValue.length >= 20
    && compactValue.length % 4 === 0
    && /^[A-Za-z0-9+/]+={0,2}$/.test(compactValue);
};

const transformText = (value: string, mode: 'encode' | 'decode') => {
  if (mode === 'encode') {
    const utf8Bytes = new TextEncoder().encode(value);
    let binaryString = '';
    utf8Bytes.forEach((byte) => {
      binaryString += String.fromCharCode(byte);
    });
    return btoa(binaryString);
  }

  const binary = atob(value.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const Base64Codec: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');

  // Text Mode state
  const [textInput, setTextInput] = useState<string>('Hello World! 开发者本地工具箱');
  const [textOutput, setTextOutput] = useState<string>('SGVsbG8gV29ybGQhIOW8gOWPkeiAhemDqOmDqOW3peWFt+eusQ==');
  const [textMode, setTextMode] = useState<'encode' | 'decode'>('encode');
  const [textError, setTextError] = useState<string | null>(null);

  // Image Mode state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { pendingTransfer, consumeTransfer } = useToolBridge('base64');

  // 接收来自其他工具的数据
  useEffect(() => {
    if (!pendingTransfer) return;

    const nextMode = looksLikeBase64Text(pendingTransfer.data) ? 'decode' : 'encode';
    setActiveTab('text');
    setTextInput(pendingTransfer.data);
    setTextMode(nextMode);
    try {
      setTextOutput(transformText(pendingTransfer.data, nextMode));
      setTextError(null);
    } catch {
      setTextOutput('');
      setTextError('传入内容无法按 Base64 文本解码，请检查数据是否完整。');
    }
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageError, setImageError] = useState<string | null>(null);
  
  // UI States
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Encode text
  const handleTextProcess = (inputVal: string, mode: 'encode' | 'decode') => {
    setTextInput(inputVal);
    if (!inputVal) {
      setTextOutput('');
      setTextError(null);
      return;
    }

    try {
      setTextOutput(transformText(inputVal, mode));
      setTextError(null);
      onRecordUsage();
    } catch (err: any) {
      setTextError(`Base64 ${mode === 'encode' ? '编码' : '解码'}失败：请确认数据格式合法 (例如解码时需提供合法的 Base64 字符组)`);
    }
  };

  const handleToggleTextMode = () => {
    const nextMode = textMode === 'encode' ? 'decode' : 'encode';
    setTextMode(nextMode);
    // Swap inputs and outputs
    const prevInput = textInput;
    setTextInput(textOutput);
    setTextOutput(prevInput);
    setTextError(null);
  };

  // Image upload to Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setImageError('图片过大，为了浏览器性能请上传 5MB 以内图片');
        return;
      }
      setImageFile(file);
      setImageError(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setImageBase64(event.target.result);
          onRecordUsage();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onRecordUsage();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sub tabs */}
      <div className="flex border border-slate-200 bg-slate-100/60 p-1 rounded-md gap-1 self-start">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === 'text'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Icon name="FileText" size={14} />
          文本 Base64 编解码
        </button>
        <button
          onClick={() => setActiveTab('image')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === 'image'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Icon name="Image" size={14} />
          图片转 Base64 (Data URI)
        </button>
      </div>

      {/* TEXT CODEC PANEL */}
      {activeTab === 'text' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input side */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                <Icon name="ArrowRight" className="text-slate-400 rotate-90" size={14} />
                {textMode === 'encode' ? '待编码的原文 (UTF-8)' : '待解码的 Base64 字符串'}
              </span>
              <button
                onClick={handleToggleTextMode}
                className="text-xs bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer border border-slate-300"
              >
                <Icon name="RefreshCw" size={12} />
                切换为{textMode === 'encode' ? '解码' : '编码'}
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={textInput}
                onChange={(e) => handleTextProcess(e.target.value, textMode)}
                placeholder={textMode === 'encode' ? '在此输入普通文本...' : '在此输入 Base64 密文...'}
                className="w-full h-[260px] font-mono text-xs bg-slate-50 border border-slate-200 p-4 rounded-xl outline-hidden focus:ring-1 focus:ring-black resize-none leading-relaxed text-slate-800"
              />
            </div>
          </div>

          {/* Output side */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                <Icon name="Check" className="text-emerald-500" size={14} />
                转换后的输出
              </span>
              <button
                onClick={() => handleCopy(textOutput)}
                disabled={!textOutput}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-all cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                } disabled:opacity-50`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={12} />
                {isCopied ? '已复制' : '复制输出'}
              </button>
            </div>
            <div className="p-5 flex flex-col h-full justify-between">
              <textarea
                value={textOutput}
                readOnly
                placeholder="结果将在此实时呈现..."
                className="w-full h-[260px] font-mono text-xs bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800 outline-hidden resize-none leading-relaxed"
              />

              {textError && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-md p-2.5 border border-red-100 flex items-center gap-2">
                  <Icon name="AlertTriangle" className="shrink-0 text-red-500" size={14} />
                  <span>{textError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMAGE CONVERTER PANEL */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Controller Side */}
          <div className="md:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-3">上传本地图片</h4>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-slate-900 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 bg-white rounded-full shadow-xs text-slate-800 border border-slate-100">
                  <Icon name="Upload" size={24} />
                </div>
                <div className="text-xs text-slate-600 font-bold">点击此处选择图片文件</div>
                <p className="text-[10px] text-slate-400">支持 PNG, JPG, WEBP, GIF, SVG (5MB以内)</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {imageFile && (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md border border-slate-200 flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">文件名:</span>
                  <span className="truncate max-w-[140px]">{imageFile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">文件大小:</span>
                  <span>{Math.round(imageFile.size / 1024 * 100) / 100} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">类型:</span>
                  <span>{imageFile.type}</span>
                </div>
              </div>
            )}

            {imageError && (
              <div className="text-xs text-red-600 bg-red-50 rounded-md p-2.5 border border-red-100 flex items-center gap-2">
                <Icon name="AlertTriangle" className="shrink-0 text-red-500" size={14} />
                <span>{imageError}</span>
              </div>
            )}

            {imageBase64 && (
              <button
                onClick={() => handleCopy(imageBase64)}
                className={`w-full py-2.5 rounded-md text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 border ${
                  isCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-900 text-white hover:bg-slate-950 border-transparent shadow-sm'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={14} />
                {isCopied ? '复制 Base64 Data URL 成功' : '一键复制 Base64 Data URL'}
              </button>
            )}
          </div>

          {/* Preview / Code Side */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {imageBase64 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Icon name="Eye" className="text-slate-800" size={16} />
                  <span className="font-semibold text-slate-900 text-sm">图片本地预览与大图</span>
                </div>
                
                <div className="p-4 flex justify-center bg-slate-100/50 max-h-[180px]">
                  <img
                    src={imageBase64}
                    alt="Upload Preview"
                    className="max-h-[148px] max-w-full object-contain rounded-md shadow-2xs border border-white"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-5 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-2">Base64 编码结果片段 (前 1000 字符)：</label>
                  <textarea
                    value={imageBase64.slice(0, 1000) + '... (已省略剩余字符)'}
                    readOnly
                    className="w-full h-24 font-mono text-xs bg-slate-900 text-slate-300 p-3 rounded-md border border-slate-800 outline-hidden resize-none leading-normal"
                  />
                  <div className="mt-2 text-[10px] text-slate-400 text-right">
                    总字符长度：{imageBase64.length} 字符
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 bg-white shadow-sm flex flex-col items-center justify-center gap-2 min-h-[300px]">
                <Icon name="Image" size={36} className="text-slate-300" />
                <p className="text-xs font-semibold">暂无导入图片</p>
                <span className="text-[10px]">在左侧面板上传图片文件，此处将实时展示 Base64 编码结果及预览</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
