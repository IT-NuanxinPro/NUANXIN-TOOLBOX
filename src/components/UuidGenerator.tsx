import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const UuidGenerator: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [idType, setIdType] = useState<'uuid' | 'ulid'>('uuid');
  const [quantity, setQuantity] = useState<number>(10);
  const [casing, setCasing] = useState<'lower' | 'upper'>('lower');
  const [includeHyphens, setIncludeHyphens] = useState<boolean>(true);
  const [generatedList, setGeneratedList] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isBulkCopied, setIsBulkCopied] = useState<boolean>(false);

  // Generate UUID v4
  const createUUID = (): string => {
    let uuid = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      uuid = window.crypto.randomUUID();
    } else {
      uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    if (!includeHyphens) {
      uuid = uuid.replace(/-/g, '');
    }

    return casing === 'upper' ? uuid.toUpperCase() : uuid.toLowerCase();
  };

  // Generate ULID
  const createULID = (): string => {
    const now = Date.now();
    let timePart = '';
    let temp = now;
    for (let i = 0; i < 10; i++) {
      const mod = temp % 32;
      timePart = ENCODING.charAt(mod) + timePart;
      temp = Math.floor(temp / 32);
    }
    
    let randPart = '';
    for (let i = 0; i < 16; i++) {
      const randIdx = Math.floor(Math.random() * 32);
      randPart += ENCODING.charAt(randIdx);
    }

    const ulid = timePart + randPart;
    return casing === 'upper' ? ulid.toUpperCase() : ulid.toLowerCase();
  };

  const handleGenerate = () => {
    const items: string[] = [];
    const count = Math.min(Math.max(quantity, 1), 200); // safety cap
    
    for (let i = 0; i < count; i++) {
      if (idType === 'uuid') {
        items.push(createUUID());
      } else {
        items.push(createULID());
      }
    }
    setGeneratedList(items);
    onRecordUsage();
  };

  // Run on load
  useEffect(() => {
    handleGenerate();
  }, [idType, casing, includeHyphens, quantity]);

  const handleCopySingle = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
      onRecordUsage();
    });
  };

  const handleCopyAll = () => {
    if (generatedList.length === 0) return;
    const bulkText = generatedList.join('\n');
    navigator.clipboard.writeText(bulkText).then(() => {
      setIsBulkCopied(true);
      setTimeout(() => setIsBulkCopied(false), 2000);
      onRecordUsage();
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Parameters Panel (Left) */}
      <div className="md:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Sliders" className="text-slate-900" size={16} />
          生成参数配置
        </h4>

        {/* ID Type */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">唯一标识符种类</label>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-md border border-slate-200">
            <button
              onClick={() => setIdType('uuid')}
              className={`text-xs py-1.5 font-bold rounded-md transition-all cursor-pointer ${
                idType === 'uuid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              UUID (Version 4)
            </button>
            <button
              onClick={() => setIdType('ulid')}
              className={`text-xs py-1.5 font-bold rounded-md transition-all cursor-pointer ${
                idType === 'ulid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              ULID (时间有序)
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">
            {idType === 'uuid' 
              ? 'UUID v4 是一种标准的由高熵随机数生成的 128 位数字标识符。' 
              : 'ULID 包含 48 位毫秒时间戳和 80 位熵，具有高并发按时间单调递增性。'}
          </p>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">生成数量 (1 - 200)</label>
          <input
            type="number"
            value={quantity || ''}
            min={1}
            max={200}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-mono text-slate-800 font-semibold"
          />
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-600">其它细节参数</label>
          
          <div className="flex flex-col gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-500">字母大小写:</span>
              <label className="inline-flex items-center gap-1 cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="casing"
                  checked={casing === 'lower'}
                  onChange={() => setCasing('lower')}
                  className="text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                />
                小写
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer font-semibold">
                <input
                  type="radio"
                  name="casing"
                  checked={casing === 'upper'}
                  onChange={() => setCasing('upper')}
                  className="text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                />
                大写
              </label>
            </div>

            {idType === 'uuid' && (
              <label className="flex items-center gap-2 cursor-pointer mt-1.5 font-semibold">
                <input
                  type="checkbox"
                  checked={includeHyphens}
                  onChange={(e) => setIncludeHyphens(e.target.checked)}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                />
                保留连接连字符 (-)
              </label>
            )}
          </div>
        </div>

        {/* Regnerate trigger */}
        <button
          onClick={handleGenerate}
          className="w-full mt-2 cursor-pointer bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2.5 rounded-md transition-all shadow-xs flex items-center justify-center gap-1.5"
        >
          <Icon name="RefreshCw" size={12} />
          重新生成一批
        </button>
      </div>

      {/* Generated list panel (Right) */}
      <div className="md:col-span-8 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Fingerprint" size={16} />
              </span>
              生成的唯一 ID 列表 ({generatedList.length})
            </span>

            <button
              onClick={handleCopyAll}
              disabled={generatedList.length === 0}
              className={`flex items-center gap-1 font-semibold text-xs py-1.5 px-3.5 rounded-md border transition-all cursor-pointer ${
                isBulkCopied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              } disabled:opacity-50`}
            >
              <Icon name={isBulkCopied ? 'Check' : 'Copy'} size={12} />
              {isBulkCopied ? '已批量复制全部' : '一键复制全部'}
            </button>
          </div>

          {/* List content */}
          <div className="p-5 max-h-[460px] overflow-y-auto divide-y divide-slate-100">
            {generatedList.map((idStr, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between hover:bg-slate-50 px-2 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400 w-5 text-right">{idx + 1}</span>
                  <span className="font-mono text-xs font-semibold text-slate-800 break-all select-all">{idStr}</span>
                </div>
                
                <button
                  onClick={() => handleCopySingle(idStr, idx)}
                  className={`p-1.5 rounded-md transition-all border cursor-pointer ${
                    copiedIndex === idx
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 border-transparent'
                  }`}
                  title="复制单个"
                >
                  <Icon name={copiedIndex === idx ? 'Check' : 'Copy'} size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
