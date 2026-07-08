import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface UserAgentParserProps {
  onRecordUsage: () => void;
}

export const UserAgentParser: React.FC<UserAgentParserProps> = ({ onRecordUsage }) => {
  const [uaString, setUaString] = useState<string>('');
  const [parsedInfo, setParsedInfo] = useState<{
    browser: string;
    version: string;
    os: string;
    engine: string;
    deviceType: string;
  } | null>(null);

  useEffect(() => {
    // Read user's own UA on mount
    if (typeof navigator !== 'undefined') {
      const currentUa = navigator.userAgent;
      setUaString(currentUa);
      parseUa(currentUa);
    }
  }, []);

  const PRESETS = [
    {
      name: 'Chrome Desktop (Windows 11)',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    {
      name: 'Safari Mobile (iPhone iOS 17)',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    },
    {
      name: 'Android Chrome (Pixel 8)',
      ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230815.036) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
    },
    {
      name: 'Googlebot Web Crawler',
      ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
    {
      name: 'WeChat Built-in Browser',
      ua: 'Mozilla/5.0 (Linux; Android 10; LIO-AL00 Build/HUAWEILIO-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 Mobile Safari/537.36 MMWEBID/3120 MicroMessenger/7.0.12.1620(0x27000C36) Process/tools NetType/WIFI Language/zh_CN ABI/arm64',
    },
  ];

  const parseUa = (ua: string) => {
    if (!ua.trim()) {
      setParsedInfo(null);
      return;
    }

    const lower = ua.toLowerCase();
    let browser = '未知浏览器';
    let version = '未知版本';
    let os = '未知操作系统';
    let engine = '未知内核';
    let deviceType = '桌面端 (Desktop)';

    // 1. Detect OS
    if (lower.includes('windows')) {
      if (lower.includes('nt 10.0')) os = 'Windows 10 / 11';
      else if (lower.includes('nt 6.3')) os = 'Windows 8.1';
      else if (lower.includes('nt 6.2')) os = 'Windows 8';
      else if (lower.includes('nt 6.1')) os = 'Windows 7';
      else os = 'Windows (经典版本)';
    } else if (lower.includes('macintosh') || lower.includes('mac os x')) {
      if (lower.includes('iphone')) os = 'iOS (iPhone)';
      else if (lower.includes('ipad')) os = 'iOS (iPad)';
      else os = 'macOS';
    } else if (lower.includes('android')) {
      const match = ua.match(/Android\s+([0-9.]+)/i);
      os = `Android ${match ? match[1] : ''}`;
    } else if (lower.includes('iphone')) {
      os = 'iOS (iPhone)';
    } else if (lower.includes('ipad')) {
      os = 'iOS (iPad)';
    } else if (lower.includes('linux')) {
      os = 'Linux';
    }

    // 2. Detect Device Type
    if (lower.includes('mobile') || lower.includes('phone') || lower.includes('android') || lower.includes('iphone')) {
      deviceType = '移动端 (Mobile)';
    } else if (lower.includes('ipad') || lower.includes('tablet')) {
      deviceType = '平板电脑 (Tablet)';
    } else if (lower.includes('spider') || lower.includes('bot') || lower.includes('crawl')) {
      deviceType = '搜索引擎爬虫 (Web Crawler)';
    }

    // 3. Detect Engine
    if (lower.includes('applewebkit')) {
      engine = 'WebKit / Blink (Chrome/Safari)';
    } else if (lower.includes('gecko/')) {
      engine = 'Gecko (Firefox)';
    } else if (lower.includes('trident/')) {
      engine = 'Trident (IE)';
    }

    // 4. Detect Browser
    if (lower.includes('micromessenger')) {
      browser = '微信内置浏览器 (WeChat)';
    } else if (lower.includes('googlebot')) {
      browser = 'Google 爬虫 (Googlebot)';
    } else if (lower.includes('edg/')) {
      browser = 'Microsoft Edge';
      const match = ua.match(/Edg\/([0-9.]+)/i);
      version = match ? match[1] : '';
    } else if (lower.includes('chrome') && !lower.includes('chromium')) {
      browser = 'Google Chrome';
      const match = ua.match(/Chrome\/([0-9.]+)/i);
      version = match ? match[1] : '';
    } else if (lower.includes('safari') && !lower.includes('chrome')) {
      browser = 'Apple Safari';
      const match = ua.match(/Version\/([0-9.]+)/i);
      version = match ? match[1] : '';
    } else if (lower.includes('firefox')) {
      browser = 'Mozilla Firefox';
      const match = ua.match(/Firefox\/([0-9.]+)/i);
      version = match ? match[1] : '';
    } else if (lower.includes('msie') || lower.includes('trident/')) {
      browser = 'Internet Explorer';
    }

    setParsedInfo({
      browser,
      version,
      os,
      engine,
      deviceType,
    });
  };

  const handlePresetSelect = (presetUa: string) => {
    onRecordUsage();
    setUaString(presetUa);
    parseUa(presetUa);
  };

  return (
    <div id="user-agent-parser-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Parameters - Left */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Sliders" className="text-slate-900" size={16} />
          User-Agent 字符串输入
        </h4>

        {/* Text Input */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-bold text-slate-600">自定义 UA 字符串 (User-Agent string)</label>
          <textarea
            value={uaString}
            onChange={(e) => {
              setUaString(e.target.value);
              parseUa(e.target.value);
            }}
            placeholder="在此处输入或粘贴需要检测的 User-Agent 信息..."
            rows={5}
            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 p-3 rounded-lg outline-hidden focus:ring-1 focus:ring-black resize-none text-slate-800 break-all leading-relaxed"
          />
        </div>

        {/* Presets List */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">常用测试 UA 设备预设</span>
          <div className="flex flex-col gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handlePresetSelect(p.ua)}
                className={`text-left text-xs px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  uaString === p.ua
                    ? 'bg-slate-900 text-white font-semibold border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-100'
                }`}
              >
                <span>{p.name}</span>
                <Icon name="Smartphone" size={12} className="text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Parser Outputs - Right */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Eye" size={16} />
              </span>
              User-Agent 客户端分析报告
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1 justify-center">
            {parsedInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Browser name */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shrink-0">
                    <Icon name="Compass" size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">内核浏览器</span>
                    <span className="text-xs font-extrabold text-slate-800">{parsedInfo.browser}</span>
                  </div>
                </div>

                {/* Version */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shrink-0">
                    <Icon name="Fingerprint" size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">版本标识</span>
                    <span className="text-xs font-extrabold text-slate-800 font-mono">{parsedInfo.version}</span>
                  </div>
                </div>

                {/* Operating system */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shrink-0">
                    <Icon name="Cpu" size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">操作系统</span>
                    <span className="text-xs font-extrabold text-slate-800">{parsedInfo.os}</span>
                  </div>
                </div>

                {/* Device Type */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shrink-0">
                    <Icon name="Smartphone" size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">物理设备类型</span>
                    <span className="text-xs font-extrabold text-slate-800">{parsedInfo.deviceType}</span>
                  </div>
                </div>

                {/* Rendering Engine */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3 md:col-span-2">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shrink-0">
                    <Icon name="Server" size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">排版渲染引擎 (Rendering Engine)</span>
                    <span className="text-xs font-bold text-slate-700 font-mono">{parsedInfo.engine}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center text-slate-400 py-12">
                <Icon name="Compass" size={36} className="mx-auto text-slate-300 mb-2 animate-pulse" />
                <p className="text-xs font-semibold">请在左侧输入或粘贴 UA 字符串进行解析报告</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
