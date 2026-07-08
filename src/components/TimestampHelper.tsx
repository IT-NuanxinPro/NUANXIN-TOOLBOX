import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

export const TimestampHelper: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  // Live ticking clock state
  const [currentSecs, setCurrentSecs] = useState<number>(Math.floor(Date.now() / 1000));
  const [currentMs, setCurrentMs] = useState<number>(Date.now());
  const [clockActive, setClockActive] = useState<boolean>(true);

  // Conversion state 1: Timestamp to Date
  const [tsInput, setTsInput] = useState<string>(Math.floor(Date.now() / 1000).toString());
  const [tsUnit, setTsUnit] = useState<'s' | 'ms'>('s');
  const [dateOutput, setDateOutput] = useState<string>('');

  // Conversion state 2: Date to Timestamp
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().slice(0, 19).replace('T', ' '));
  const [secOutput, setSecOutput] = useState<string>('');
  const [msOutput, setMsOutput] = useState<string>('');

  // Clipboard success
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Ticking effect
  useEffect(() => {
    let interval: any;
    if (clockActive) {
      interval = setInterval(() => {
        const now = Date.now();
        setCurrentSecs(Math.floor(now / 1000));
        setCurrentMs(now);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockActive]);

  // Initial runs
  useEffect(() => {
    handleTsToDate(tsInput, tsUnit);
    handleDateToTs(dateInput);
  }, []);

  const handleTsToDate = (ts: string, unit: 's' | 'ms') => {
    setTsInput(ts);
    if (!ts) {
      setDateOutput('');
      return;
    }
    try {
      const numericTs = parseInt(ts);
      if (isNaN(numericTs)) {
        setDateOutput('无效的时间戳数字');
        return;
      }
      const date = new Date(unit === 's' ? numericTs * 1000 : numericTs);
      if (isNaN(date.getTime())) {
        setDateOutput('无法解析此时间戳');
        return;
      }
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const localStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      const utcStr = date.toUTCString();
      setDateOutput(`北京时间(本地): ${localStr}\n国际标准时间(UTC): ${utcStr}`);
    } catch {
      setDateOutput('解析失败');
    }
  };

  const handleDateToTs = (dt: string) => {
    setDateInput(dt);
    if (!dt) {
      setSecOutput('');
      setMsOutput('');
      return;
    }
    try {
      // Standardize date input format
      const formatted = dt.trim().replace(' ', 'T');
      const parsed = Date.parse(formatted) || Date.parse(dt);
      if (isNaN(parsed)) {
        setSecOutput('无效的日期格式');
        setMsOutput('无效的日期格式');
        return;
      }
      setSecOutput(Math.floor(parsed / 1000).toString());
      setMsOutput(parsed.toString());
    } catch {
      setSecOutput('解析异常');
      setMsOutput('解析异常');
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 1500);
      onRecordUsage();
    });
  };

  const applyOffset = (offsetSecs: number) => {
    const nextVal = parseInt(tsInput) + offsetSecs;
    if (!isNaN(nextVal)) {
      handleTsToDate(nextVal.toString(), tsUnit);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Live Running Clocks Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${clockActive ? 'bg-emerald-400' : 'bg-gray-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${clockActive ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
            </span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">实时时间戳时钟 (本地时间)</span>
          </div>
          
          <div className="text-2xl font-bold font-mono text-slate-100 flex flex-wrap items-baseline gap-x-4">
            <span>{currentSecs} <span className="text-xs font-semibold text-slate-500">秒</span></span>
            <span className="text-slate-700">|</span>
            <span>{currentMs} <span className="text-xs font-semibold text-slate-500">毫秒</span></span>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            当前时间: {new Date(currentMs).toLocaleString('zh-CN', { timeZoneName: 'short' })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(currentSecs.toString(), 'live-s')}
            className={`cursor-pointer px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 border transition-all ${
              copiedText === 'live-s'
                ? 'bg-emerald-500 text-white border-transparent'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <Icon name={copiedText === 'live-s' ? 'Check' : 'Copy'} size={12} />
            {copiedText === 'live-s' ? '已复制' : '复制秒时间戳'}
          </button>
          
          <button
            onClick={() => setClockActive(!clockActive)}
            className="cursor-pointer p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={clockActive ? '暂停计时' : '恢复计时'}
          >
            <Icon name={clockActive ? 'Terminal' : 'RefreshCw'} size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Converter 1: Epoch to Date */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
              <Icon name="Sliders" className="text-slate-900" size={16} />
              时间戳 ➔ 格式化日期时间
            </h4>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-1">
              <input
                type="text"
                value={tsInput}
                onChange={(e) => handleTsToDate(e.target.value.replace(/\D/g, ''), tsUnit)}
                placeholder="输入时间戳..."
                className="w-full text-xs bg-transparent border-0 outline-hidden p-0 font-mono focus:ring-0 text-slate-800"
              />
            </div>
            
            <select
              value={tsUnit}
              onChange={(e) => {
                const nextUnit = e.target.value as 's' | 'ms';
                setTsUnit(nextUnit);
                // Adjust value appropriately
                let nextVal = tsInput;
                if (nextUnit === 'ms' && tsInput.length <= 10) {
                  nextVal = (parseInt(tsInput) * 1000).toString();
                } else if (nextUnit === 's' && tsInput.length > 10) {
                  nextVal = Math.floor(parseInt(tsInput) / 1000).toString();
                }
                handleTsToDate(nextVal, nextUnit);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-black"
            >
              <option value="s">秒 (s)</option>
              <option value="ms">毫秒 (ms)</option>
            </select>
          </div>

          {/* Quick offsets */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                const current = tsUnit === 's' ? Math.floor(Date.now() / 1000) : Date.now();
                handleTsToDate(current.toString(), tsUnit);
              }}
              className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors cursor-pointer border border-slate-200"
            >
              现在
            </button>
            <button
              onClick={() => applyOffset(-3600)}
              disabled={tsUnit === 'ms'}
              className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer border border-slate-200"
            >
              -1 小时
            </button>
            <button
              onClick={() => applyOffset(3600)}
              disabled={tsUnit === 'ms'}
              className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer border border-slate-200"
            >
              +1 小时
            </button>
            <button
              onClick={() => applyOffset(-86400)}
              disabled={tsUnit === 'ms'}
              className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer border border-slate-200"
            >
              -1 天
            </button>
            <button
              onClick={() => applyOffset(86400)}
              disabled={tsUnit === 'ms'}
              className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer border border-slate-200"
            >
              +1 天
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">解析出的日期字符串 (本地/UTC)：</label>
            <textarea
              value={dateOutput}
              readOnly
              rows={3}
              className="w-full font-mono text-xs bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-850 outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Converter 2: Date to Epoch */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
              <Icon name="Sliders" className="text-slate-900" size={16} />
              格式化日期 ➔ 时间戳
            </h4>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">本地日期时间字符串</label>
            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-1">
              <input
                type="text"
                value={dateInput}
                onChange={(e) => handleDateToTs(e.target.value)}
                placeholder="2026-07-08 12:00:00"
                className="w-full text-xs bg-transparent border-0 outline-hidden p-0 font-mono focus:ring-0 text-slate-800"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">支持格式: YYYY-MM-DD hh:mm:ss 或 ISO 标准日期格式</p>
          </div>

          {/* Outputs */}
          <div className="flex flex-col gap-3 mt-1.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-500">秒级时间戳 (10位)</span>
                <button
                  onClick={() => handleCopy(secOutput, 's-out')}
                  disabled={!secOutput || secOutput.includes('无效')}
                  className="text-[10px] text-slate-800 hover:text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Icon name={copiedText === 's-out' ? 'Check' : 'Copy'} size={10} />
                  {copiedText === 's-out' ? '已复制' : '复制'}
                </button>
              </div>
              <input
                type="text"
                value={secOutput}
                readOnly
                className="w-full text-xs font-mono bg-slate-900 text-emerald-400 rounded-md p-2 border border-slate-800 focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-500">毫秒级时间戳 (13位)</span>
                <button
                  onClick={() => handleCopy(msOutput, 'ms-out')}
                  disabled={!msOutput || msOutput.includes('无效')}
                  className="text-[10px] text-slate-800 hover:text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Icon name={copiedText === 'ms-out' ? 'Check' : 'Copy'} size={10} />
                  {copiedText === 'ms-out' ? '已复制' : '复制'}
                </button>
              </div>
              <input
                type="text"
                value={msOutput}
                readOnly
                className="w-full text-xs font-mono bg-slate-900 text-emerald-400 rounded-md p-2 border border-slate-800 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
