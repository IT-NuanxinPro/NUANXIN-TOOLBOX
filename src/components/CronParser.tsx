import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useToolBridge } from '../hooks/useToolBridge';

interface CronParserProps {
  onRecordUsage: () => void;
}

export const CronParser: React.FC<CronParserProps> = ({ onRecordUsage }) => {
  const [cronExpression, setCronExpression] = useState<string>('*/5 * * * *');
  const [explanation, setExplanation] = useState<string>('');
  const [nextRunTimes, setNextRunTimes] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { pendingTransfer, consumeTransfer } = useToolBridge('cron-parser');

  useEffect(() => {
    if (!pendingTransfer) return;
    setCronExpression(pendingTransfer.data);
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);

  useEffect(() => {
    parseCron();
  }, [cronExpression]);

  const PRESETS = [
    { label: '每分钟一次', val: '* * * * *' },
    { label: '每 5 分钟一次', val: '*/5 * * * *' },
    { label: '每小时整点', val: '0 * * * *' },
    { label: '每天凌晨 2 点', val: '0 2 * * *' },
    { label: '每周一早上 8:30', val: '30 8 * * 1' },
    { label: '每月 1 号中午 12 点', val: '0 12 1 * *' },
    { label: '工作日每小时整点', val: '0 * * * 1-5' },
  ];

  const parseCron = () => {
    setErrorMsg(null);
    setExplanation('');
    setNextRunTimes([]);

    if (!cronExpression.trim()) return;

    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) {
      setErrorMsg('无效的 Cron 格式。标准 Cron 表达式必须包含 5 个字段（分、时、日、月、周）。');
      return;
    }

    try {
      const [min, hour, dom, month, dow] = parts;

      // 1. Core Chinese translation explanation
      const explainField = (field: string, type: 'min' | 'hour' | 'dom' | 'month' | 'dow'): string => {
        if (field === '*') {
          return type === 'min' ? '每分钟' : type === 'hour' ? '每小时' : type === 'dom' ? '每天' : type === 'month' ? '每月' : '每星期';
        }

        // Handle step: */5
        if (field.startsWith('*/')) {
          const step = field.substring(2);
          const unit = type === 'min' ? '分钟' : type === 'hour' ? '小时' : type === 'dom' ? '天' : type === 'month' ? '个月' : '周';
          return `每隔 ${step} ${unit}`;
        }

        // Handle range: 1-5
        if (field.includes('-')) {
          const [start, end] = field.split('-');
          if (type === 'dow') {
            const days = ['日', '一', '二', '三', '四', '五', '六'];
            return `星期${days[parseInt(start)] || start} 到 星期${days[parseInt(end)] || end}`;
          }
          const unit = type === 'min' ? '分' : type === 'hour' ? '点' : type === 'dom' ? '号' : type === 'month' ? '月' : '';
          return `${start}${unit} 到 ${end}${unit}`;
        }

        // Handle lists: 1,3,5
        if (field.includes(',')) {
          const list = field.split(',');
          if (type === 'dow') {
            const days = ['日', '一', '二', '三', '四', '五', '六'];
            return `星期` + list.map(d => days[parseInt(d)] || d).join('、');
          }
          const unit = type === 'min' ? '分' : type === 'hour' ? '点' : type === 'dom' ? '号' : type === 'month' ? '月' : '';
          return list.map(l => `${l}${unit}`).join('、');
        }

        // Specific single value
        if (type === 'dow') {
          const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
          return days[parseInt(field)] || `周${field}`;
        }
        const unit = type === 'min' ? '分' : type === 'hour' ? '点' : type === 'dom' ? '号' : type === 'month' ? '月' : '';
        return `${field}${unit}`;
      };

      const expMin = explainField(min, 'min');
      const expHour = explainField(hour, 'hour');
      const expDom = explainField(dom, 'dom');
      const expMonth = explainField(month, 'month');
      const expDow = explainField(dow, 'dow');

      let summary = '';
      if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
        summary = '在每年的每月、每天的每小时的每一分钟执行一次。';
      } else {
        summary = `在 ${expMonth} 的 ${expDom}（或 ${expDow}），处于 ${expHour} 的 ${expMin} 执行一次。`;
      }

      setExplanation(summary);

      // 2. Simple Mock Next 5 Run Times based on local clock
      const runs: string[] = [];
      let mockTime = new Date();
      mockTime.setSeconds(0);
      mockTime.setMilliseconds(0);

      // Check step interval
      let stepMin = 1;
      if (min.startsWith('*/')) stepMin = parseInt(min.substring(2)) || 1;
      else if (min !== '*' && !isNaN(parseInt(min))) stepMin = 60; // exact minute check

      let iterations = 0;
      while (runs.length < 5 && iterations < 10000) {
        iterations++;
        // Check if mockTime matches CRON
        let match = true;
        
        // 1. Check minute
        if (min !== '*') {
          if (min.startsWith('*/')) {
            const step = parseInt(min.substring(2));
            if (mockTime.getMinutes() % step !== 0) match = false;
          } else if (min.includes(',')) {
            const list = min.split(',').map(Number);
            if (!list.includes(mockTime.getMinutes())) match = false;
          } else if (min.includes('-')) {
            const [s, e] = min.split('-').map(Number);
            const m = mockTime.getMinutes();
            if (m < s || m > e) match = false;
          } else {
            if (mockTime.getMinutes() !== parseInt(min)) match = false;
          }
        }

        // 2. Check hour
        if (hour !== '*' && match) {
          if (hour.startsWith('*/')) {
            const step = parseInt(hour.substring(2));
            if (mockTime.getHours() % step !== 0) match = false;
          } else if (hour.includes(',')) {
            const list = hour.split(',').map(Number);
            if (!list.includes(mockTime.getHours())) match = false;
          } else if (hour.includes('-')) {
            const [s, e] = hour.split('-').map(Number);
            const h = mockTime.getHours();
            if (h < s || h > e) match = false;
          } else {
            if (mockTime.getHours() !== parseInt(hour)) match = false;
          }
        }

        // 3. Check day-of-month
        if (dom !== '*' && match) {
          if (dom.includes(',')) {
            const list = dom.split(',').map(Number);
            if (!list.includes(mockTime.getDate())) match = false;
          } else if (dom.includes('-')) {
            const [s, e] = dom.split('-').map(Number);
            const d = mockTime.getDate();
            if (d < s || d > e) match = false;
          } else {
            if (mockTime.getDate() !== parseInt(dom)) match = false;
          }
        }

        // 4. Check month (0-indexed in JS)
        if (month !== '*' && match) {
          const currentMonth = mockTime.getMonth() + 1;
          if (month.includes(',')) {
            const list = month.split(',').map(Number);
            if (!list.includes(currentMonth)) match = false;
          } else if (month.includes('-')) {
            const [s, e] = month.split('-').map(Number);
            if (currentMonth < s || currentMonth > e) match = false;
          } else {
            if (currentMonth !== parseInt(month)) match = false;
          }
        }

        // 5. Check day-of-week
        if (dow !== '*' && match) {
          const currentDow = mockTime.getDay(); // 0 is Sunday
          if (dow.includes(',')) {
            const list = dow.split(',').map(Number);
            if (!list.includes(currentDow)) match = false;
          } else if (dow.includes('-')) {
            const [s, e] = dow.split('-').map(Number);
            if (currentDow < s || currentDow > e) match = false;
          } else {
            if (currentDow !== parseInt(dow)) match = false;
          }
        }

        if (match) {
          // Format date beautifully
          runs.push(mockTime.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }));
        }

        // Increment time
        mockTime.setMinutes(mockTime.getMinutes() + (stepMin > 0 ? 1 : 1));
      }

      if (runs.length === 0) {
        setNextRunTimes(['未能计算出符合规则的近期执行时间，请确认数值范围。']);
      } else {
        setNextRunTimes(runs);
      }
    } catch (err: any) {
      setErrorMsg(`解析执行错误: ${err.message || '表达式字段超出标准规则。'}`);
    }
  };

  return (
    <div id="cron-parser-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Parameters - Left */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Sliders" className="text-slate-900" size={16} />
          Cron 表达式编辑与预设
        </h4>

        {/* Input cron string */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600">Cron 表达式 (分 时 日 月 周)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="e.g. */5 * * * *"
              className="flex-1 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-slate-800 font-bold focus:outline-hidden focus:ring-1 focus:ring-black"
            />
            <button
              onClick={() => {
                parseCron();
                onRecordUsage();
              }}
              className="text-xs bg-slate-900 hover:bg-slate-950 text-white font-bold px-4 py-2 rounded-md cursor-pointer transition-colors"
            >
              解析
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">常用开发预设</span>
          <div className="grid grid-cols-1 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setCronExpression(p.val);
                  onRecordUsage();
                }}
                className={`text-left text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  cronExpression === p.val
                    ? 'bg-slate-900 text-white font-semibold border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-100'
                }`}
              >
                <span>{p.label}</span>
                <span className="font-mono text-[11px] font-medium text-slate-400">{p.val}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parser result - Right */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="ServerCrash" size={16} />
              </span>
              Cron 规则语义还原
            </span>
          </div>

          <div className="p-5 flex flex-col gap-5 flex-1">
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold flex items-center gap-2">
                <Icon name="AlertTriangle" size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Translation Text */}
            {explanation && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  中文语义化解释 (Local Translation)
                </span>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {explanation}
                </p>
              </div>
            )}

            {/* Next execution times */}
            <div className="flex-1 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                未来 5 次预估触发执行时间 (Next Run Times)
              </span>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1 overflow-auto max-h-[220px]">
                {nextRunTimes.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {nextRunTimes.map((time, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs font-semibold font-mono text-slate-700 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                        <span className="text-slate-400">[{idx + 1}]</span>
                        <Icon name="Clock" size={12} className="text-slate-400" />
                        <span>{time}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-semibold">
                    等待正确输入 Cron 表达式...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mini Table help info */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-400 leading-relaxed grid grid-cols-5 text-center font-mono text-[10px]">
          <div>
            <span className="font-bold text-slate-700 block">分</span>
            0-59
          </div>
          <div>
            <span className="font-bold text-slate-700 block">时</span>
            0-23
          </div>
          <div>
            <span className="font-bold text-slate-700 block">日</span>
            1-31
          </div>
          <div>
            <span className="font-bold text-slate-700 block">月</span>
            1-12
          </div>
          <div>
            <span className="font-bold text-slate-700 block">周</span>
            0-6 (0=日)
          </div>
        </div>
      </div>
    </div>
  );
};
