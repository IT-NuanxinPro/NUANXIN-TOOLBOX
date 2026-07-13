import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useToolBridge } from '../hooks/useToolBridge';

interface SubnetCalculatorProps {
  onRecordUsage: () => void;
}

export const SubnetCalculator: React.FC<SubnetCalculatorProps> = ({ onRecordUsage }) => {
  const [cidr, setCidr] = useState<string>('192.168.1.0/24');
  const [results, setResults] = useState<{
    ip: string;
    maskBits: number;
    netmask: string;
    networkAddress: string;
    broadcastAddress: string;
    firstHost: string;
    lastHost: string;
    totalHosts: number;
    binaryIp: string;
    binaryMask: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { pendingTransfer, consumeTransfer } = useToolBridge('subnet-calculator');

  useEffect(() => {
    if (!pendingTransfer) return;
    setCidr(pendingTransfer.data);
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);

  useEffect(() => {
    calculateSubnet();
  }, [cidr]);

  const PRESETS = [
    { label: '家庭/局域网 A 段 (C级)', val: '192.168.1.0/24' },
    { label: '企业网络子网 B 段', val: '172.16.0.0/16' },
    { label: '大型私有网络 A 段', val: '10.0.0.0/8' },
    { label: '容器专有网络网段', val: '172.17.0.0/24' },
    { label: '窄子网网段 (4个可用主机)', val: '192.168.10.0/30' },
  ];

  // Helper to parse IP into number
  const ipToLong = (ip: string): number => {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  };

  // Helper to convert number back to IP
  const longToIp = (long: number): string => {
    return [
      (long >>> 24) & 255,
      (long >>> 16) & 255,
      (long >>> 8) & 255,
      long & 255,
    ].join('.');
  };

  // Binary presentation
  const toBinaryString = (long: number): string => {
    const raw = (long >>> 0).toString(2).padStart(32, '0');
    return raw.match(/.{8}/g)?.join('.') || raw;
  };

  const calculateSubnet = () => {
    onRecordUsage();
    setErrorMsg(null);
    setResults(null);

    const cidrRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/;
    const match = cidr.trim().match(cidrRegex);

    if (!match) {
      setErrorMsg('请输入正确的 IPv4 CIDR 网段格式，例如: 192.168.1.0/24 或 10.0.0.0/8');
      return;
    }

    const ipStr = match[1];
    const maskBits = parseInt(match[2]);

    if (maskBits < 0 || maskBits > 32) {
      setErrorMsg('子网掩码位数必须在 0 到 32 之间');
      return;
    }

    // Validate IP parts
    const ipParts = ipStr.split('.').map(Number);
    if (ipParts.some((p) => p < 0 || p > 255)) {
      setErrorMsg('IP 地址各字节段数值必须处于 0 - 255 之间');
      return;
    }

    try {
      const ipLong = ipToLong(ipStr);
      
      // Calculate netmask
      const maskLong = maskBits === 0 ? 0 : (~0 << (32 - maskBits));
      
      // Calculate Network IP
      const networkLong = ipLong & maskLong;
      
      // Calculate Broadcast IP
      const broadcastLong = networkLong | ~maskLong;

      // Usable range
      let firstHostLong = networkLong + 1;
      let lastHostLong = broadcastLong - 1;
      let totalHosts = broadcastLong - networkLong - 1;

      if (maskBits === 32) {
        firstHostLong = networkLong;
        lastHostLong = networkLong;
        totalHosts = 1;
      } else if (maskBits === 31) {
        firstHostLong = networkLong;
        lastHostLong = broadcastLong;
        totalHosts = 2;
      } else if (totalHosts < 0) {
        totalHosts = 0;
      }

      setResults({
        ip: ipStr,
        maskBits,
        netmask: longToIp(maskLong),
        networkAddress: longToIp(networkLong),
        broadcastAddress: longToIp(broadcastLong),
        firstHost: totalHosts > 0 ? longToIp(firstHostLong) : '无',
        lastHost: totalHosts > 0 ? longToIp(lastHostLong) : '无',
        totalHosts: totalHosts,
        binaryIp: toBinaryString(ipLong),
        binaryMask: toBinaryString(maskLong),
      });
    } catch (err: any) {
      setErrorMsg(`计算异常: ${err.message}`);
    }
  };

  return (
    <div id="subnet-calculator-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Configuration Panel - Left */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Sliders" className="text-slate-900" size={16} />
          CIDR 网络配置输入
        </h4>

        {/* Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600">IP 及网段掩码 (IPv4 CIDR)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cidr}
              onChange={(e) => setCidr(e.target.value)}
              placeholder="e.g. 192.168.1.0/24"
              className="flex-1 text-sm font-mono bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-slate-800 font-bold focus:outline-hidden focus:ring-1 focus:ring-black"
            />
            <button
              onClick={calculateSubnet}
              className="text-xs bg-slate-900 hover:bg-slate-950 text-white font-bold px-4 py-2 rounded-md transition-colors cursor-pointer"
            >
              计算
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">常用局域网网段模板</span>
          <div className="grid grid-cols-1 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setCidr(p.val);
                  onRecordUsage();
                }}
                className={`text-left text-xs px-3 py-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  cidr === p.val
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

      {/* Output Panel - Right */}
      <div className="lg:col-span-7 flex flex-col gap-4 animate-fade-in">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Server" size={16} />
              </span>
              IP 网段拆解计算报告
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold flex items-center gap-2">
                <Icon name="AlertTriangle" size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {results && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Network IP */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-sans">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">网络号 / 网络地址 (Network)</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{results.networkAddress}</span>
                </div>

                {/* Subnet mask */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-sans">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">子网掩码 (Netmask)</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{results.netmask}</span>
                </div>

                {/* First host */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-sans">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">首个可用主机 (First Usable Host)</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{results.firstHost}</span>
                </div>

                {/* Last host */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-sans">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">末个可用主机 (Last Usable Host)</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{results.lastHost}</span>
                </div>

                {/* Broadcast IP */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-sans">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">广播地址 (Broadcast)</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{results.broadcastAddress}</span>
                </div>

                {/* Usable Hosts Count */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-sans">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">可用 IP 主机数 (Usable Hosts)</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{results.totalHosts.toLocaleString()} 个</span>
                </div>

                {/* Binary Details */}
                <div className="md:col-span-2 border-t border-slate-100 pt-3 mt-1 flex flex-col gap-3 font-mono text-[10px]">
                  <div>
                    <span className="font-bold text-slate-400 block mb-1">IP 进制表示形式 (Binary IP):</span>
                    <span className="text-slate-700 font-semibold break-all bg-slate-50 p-1.5 rounded block">{results.binaryIp}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 block mb-1">掩码进制表示形式 (Binary Mask):</span>
                    <span className="text-slate-700 font-semibold break-all bg-slate-50 p-1.5 rounded block">{results.binaryMask}</span>
                  </div>
                </div>

              </div>
            )}

            {!results && !errorMsg && (
              <div className="text-center text-slate-400 py-16">
                <Icon name="Cpu" size={36} className="mx-auto text-slate-300 mb-2 animate-pulse" />
                <p className="text-xs font-semibold">请在左侧输入需要计算的 IP 网段信息</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
