import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface RandomPasswordProps {
  onRecordUsage: () => void;
}

export const RandomPassword: React.FC<RandomPasswordProps> = ({ onRecordUsage }) => {
  const [length, setLength] = useState<number>(16);
  const [includeUpper, setIncludeUpper] = useState<boolean>(true);
  const [includeLower, setIncludeLower] = useState<boolean>(true);
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(true);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);
  const [excludeSimilar, setExcludeSimilar] = useState<boolean>(true);
  
  const [batchCount, setBatchCount] = useState<number>(5);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [strength, setStrength] = useState<{ score: number; label: string; color: string }>({ score: 0, label: '', color: '' });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    generatePasswords();
  }, [length, includeUpper, includeLower, includeNumbers, includeSymbols, excludeSimilar, batchCount]);

  const generatePasswords = () => {
    onRecordUsage();
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const numChars = '0123456789';
    const symChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charPool = '';
    if (includeUpper) charPool += upperChars;
    if (includeLower) charPool += lowerChars;
    if (includeNumbers) charPool += numChars;
    if (includeSymbols) charPool += symChars;

    // Filter out visually confusing similar characters: o, O, 0, i, I, l, 1, q, 9
    if (excludeSimilar) {
      const similarRegex = /[oO0iIl1q9]/g;
      charPool = charPool.replace(similarRegex, '');
    }

    if (!charPool) {
      setPasswords(['请至少选中一种包含的字符集合类型']);
      setStrength({ score: 0, label: '无', color: 'text-slate-400 bg-slate-100 border-slate-200' });
      return;
    }

    const results: string[] = [];
    for (let b = 0; b < batchCount; b++) {
      let singlePass = '';
      const array = new Uint32Array(length);
      window.crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        const randomIndex = array[i] % charPool.length;
        singlePass += charPool.charAt(randomIndex);
      }
      results.push(singlePass);
    }

    setPasswords(results);
    calculateStrength();
  };

  const calculateStrength = () => {
    // Basic entropy strength calculator
    let charsetSize = 0;
    if (includeUpper) charsetSize += excludeSimilar ? 24 : 26;
    if (includeLower) charsetSize += excludeSimilar ? 23 : 26;
    if (includeNumbers) charsetSize += excludeSimilar ? 8 : 10;
    if (includeSymbols) charsetSize += 26;

    const entropy = length * Math.log2(charsetSize || 1);

    if (entropy < 40) {
      setStrength({ score: 1, label: '弱 (容易被破解)', color: 'text-rose-700 bg-rose-50 border-rose-100' });
    } else if (entropy < 60) {
      setStrength({ score: 2, label: '中等安全 (适合普通帐号)', color: 'text-amber-700 bg-amber-50 border-amber-100' });
    } else if (entropy < 90) {
      setStrength({ score: 3, label: '强安全 (推荐级别)', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' });
    } else {
      setStrength({ score: 4, label: '极度强固 (高级密码防护)', color: 'text-teal-700 bg-teal-50 border-teal-100' });
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div id="random-password-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Configuration Panel */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Sliders" className="text-slate-900" size={16} />
          安全密码参数设置
        </h4>

        {/* Length slider */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5 flex justify-between">
            <span>口令密码长度</span>
            <span className="font-mono text-slate-800 font-bold">{length} 字符</span>
          </label>
          <input
            type="range"
            min={6}
            max={64}
            step={1}
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value))}
            className="w-full accent-slate-900 cursor-pointer"
          />
        </div>

        {/* Charsets selection */}
        <div className="flex flex-col gap-2 mt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">包含字符集</span>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between text-xs py-1 cursor-pointer">
              <span className="text-slate-700 font-semibold">包含大写字母 (A-Z)</span>
              <input
                type="checkbox"
                checked={includeUpper}
                onChange={(e) => setIncludeUpper(e.target.checked)}
                className="rounded border-slate-300 accent-slate-900"
              />
            </label>

            <label className="flex items-center justify-between text-xs py-1 cursor-pointer">
              <span className="text-slate-700 font-semibold">包含小写字母 (a-z)</span>
              <input
                type="checkbox"
                checked={includeLower}
                onChange={(e) => setIncludeLower(e.target.checked)}
                className="rounded border-slate-300 accent-slate-900"
              />
            </label>

            <label className="flex items-center justify-between text-xs py-1 cursor-pointer">
              <span className="text-slate-700 font-semibold">包含阿拉伯数字 (0-9)</span>
              <input
                type="checkbox"
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
                className="rounded border-slate-300 accent-slate-900"
              />
            </label>

            <label className="flex items-center justify-between text-xs py-1 cursor-pointer">
              <span className="text-slate-700 font-semibold">包含特殊符号 (!@#...)</span>
              <input
                type="checkbox"
                checked={includeSymbols}
                onChange={(e) => setIncludeSymbols(e.target.checked)}
                className="rounded border-slate-300 accent-slate-900"
              />
            </label>

            <label className="flex items-center justify-between text-xs py-1 cursor-pointer border-t border-slate-100 pt-2">
              <span className="text-slate-700 font-semibold text-[11px] flex items-center gap-1">
                排除易混淆字符
                <span className="text-[10px] text-slate-400 font-normal font-mono">(o, O, 0, i, l, 1等)</span>
              </span>
              <input
                type="checkbox"
                checked={excludeSimilar}
                onChange={(e) => setExcludeSimilar(e.target.checked)}
                className="rounded border-slate-300 accent-slate-900"
              />
            </label>
          </div>
        </div>

        {/* Batch selection */}
        <div className="border-t border-slate-100 pt-3">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">一次批量生成数量</label>
          <select
            value={batchCount}
            onChange={(e) => setBatchCount(parseInt(e.target.value))}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
          >
            <option value="1">生成 1 个密码</option>
            <option value="5">生成 5 个密码 (标准)</option>
            <option value="10">生成 10 个密码</option>
            <option value="20">生成 20 个密码 (批量)</option>
          </select>
        </div>

        <button
          onClick={generatePasswords}
          className="w-full bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2.5 rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
        >
          <Icon name="RefreshCw" size={12} />
          重新生成一批强随机口令
        </button>
      </div>

      {/* Outputs Panel - Right */}
      <div className="lg:col-span-7 flex flex-col gap-4 animate-fade-in">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="ShieldCheck" size={16} />
              </span>
              强安全本地口令清单
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            {/* Strength indicator */}
            <div className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-between ${strength.color}`}>
              <div className="flex items-center gap-1.5">
                <Icon name="Gauge" size={14} />
                <span>计算得出密码安全等级：</span>
              </div>
              <span className="uppercase">{strength.label}</span>
            </div>

            {/* Password List */}
            <div className="flex-1 flex flex-col gap-2 max-h-[320px] overflow-auto pr-1">
              {passwords.map((pass, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition-all font-mono text-sm font-bold text-slate-800 bg-slate-50/20 group"
                >
                  <span className="break-all select-all pr-2">{pass}</span>
                  <button
                    onClick={() => handleCopy(pass, idx)}
                    className={`text-xs px-2.5 py-1.5 rounded-md border transition-all cursor-pointer font-sans font-bold flex items-center gap-1 ${
                      copiedIndex === idx
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Icon name={copiedIndex === idx ? 'Check' : 'Copy'} size={12} />
                    {copiedIndex === idx ? '已拷贝' : '复制'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tip info */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">🔒 强随机数安全保证：</p>
          本工具调用现代浏览器提供的 <strong>window.crypto.getRandomValues</strong> 硬件级密码学伪随机数生成器（CSPRNG），熵池碰撞系数极低，比 JavaScript 传统的 Math.random() 随机数具备成千上万倍的密码学抗预测度，防撞防暴力猜解。
        </div>
      </div>
    </div>
  );
};
