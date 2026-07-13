import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { SendToToolButton } from './SendToToolButton';
import { useToolBridge } from '../hooks/useToolBridge';

interface JwtDebuggerProps {
  onRecordUsage: () => void;
}

export const JwtDebugger: React.FC<JwtDebuggerProps> = ({ onRecordUsage }) => {
  const [token, setToken] = useState<string>('');
  const [headerJson, setHeaderJson] = useState<string>('');
  const [payloadJson, setPayloadJson] = useState<string>('');
  const [signatureHex, setSignatureHex] = useState<string>('');
  const [validationInfo, setValidationInfo] = useState<{
    status: 'none' | 'success' | 'expired' | 'error';
    message: string;
    expTime?: string;
    iatTime?: string;
  }>({ status: 'none', message: '' });
  const { pendingTransfer, consumeTransfer } = useToolBridge('jwt-debugger');

  const handleDecode = (jwtStr: string) => {
    onRecordUsage();
    setToken(jwtStr);
    setHeaderJson('');
    setPayloadJson('');
    setSignatureHex('');
    setValidationInfo({ status: 'none', message: '' });

    if (!jwtStr.trim()) return;

    const parts = jwtStr.trim().split('.');
    if (parts.length !== 3) {
      setValidationInfo({
        status: 'error',
        message: '无效的 JWT 格式！JWT 结构必须是由两个点号 \'.\' 分隔的三部分。',
      });
      return;
    }

    try {
      // Decode helper
      const base64UrlDecode = (str: string): string => {
        // Add back padding
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        return decodeURIComponent(
          window
            .atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      };

      // 1. Decode Header
      const headerDecoded = base64UrlDecode(parts[0]);
      const headerObj = JSON.parse(headerDecoded);
      setHeaderJson(JSON.stringify(headerObj, null, 2));

      // 2. Decode Payload
      const payloadDecoded = base64UrlDecode(parts[1]);
      const payloadObj = JSON.parse(payloadDecoded);
      setPayloadJson(JSON.stringify(payloadObj, null, 2));

      // 3. Signature Part
      setSignatureHex(parts[2]);

      // 4. Validate Exp / Iat timestamps
      let expText = '';
      let iatText = '';
      let isExpired = false;
      let status: 'success' | 'expired' = 'success';
      let message = '此 JWT 在本地解码成功，结构完整。';

      if (payloadObj.exp) {
        const expDate = new Date(payloadObj.exp * 1000);
        expText = expDate.toLocaleString();
        if (expDate.getTime() < Date.now()) {
          isExpired = true;
          status = 'expired';
          message = '⚠️ 警告: 该 Token 已于过期时间过期。';
        } else {
          message += ` (有效期至: ${expText})`;
        }
      }

      if (payloadObj.iat) {
        iatText = new Date(payloadObj.iat * 1000).toLocaleString();
      }

      setValidationInfo({
        status,
        message,
        expTime: expText,
        iatTime: iatText,
      });
    } catch (err: any) {
      setValidationInfo({
        status: 'error',
        message: `解析错误: ${err.message || '部分数据可能存在错误的 Base64url 格式。'}`,
      });
    }
  };

  useEffect(() => {
    if (!pendingTransfer) return;
    handleDecode(pendingTransfer.data);
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);

  // Sample Token for Testing
  const handleLoadSample = () => {
    // Generate a valid header (HS256) and payload with future expiration date
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: '1234567890',
      name: '暖心开发者',
      admin: true,
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours later
    };

    const b64 = (obj: any) =>
      window
        .btoa(JSON.stringify(obj))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const tokenSample = `${b64(header)}.${b64(payload)}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;
    handleDecode(tokenSample);
  };

  return (
    <div id="jwt-debugger-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Input panel - left */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Icon name="Key" className="text-slate-900" size={16} />
            JWT 密钥解析
          </h4>
          <button
            onClick={handleLoadSample}
            className="text-xs text-slate-800 font-bold hover:underline cursor-pointer"
          >
            加载测试 Token
          </button>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-bold text-slate-600">在此粘贴您的 JWT Token</label>
          <textarea
            value={token}
            onChange={(e) => handleDecode(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxw..."
            className="w-full flex-1 min-h-[220px] text-[11px] font-mono bg-slate-50 border border-slate-200 p-3 rounded-lg outline-hidden focus:ring-1 focus:ring-black resize-none text-slate-800 break-all leading-relaxed"
          />
        </div>

        {/* Local Validation Status banner */}
        {validationInfo.status !== 'none' && (
          <div
            className={`p-3.5 rounded-lg border text-xs font-semibold flex items-start gap-2.5 ${
              validationInfo.status === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                : validationInfo.status === 'expired'
                ? 'bg-amber-50 text-amber-800 border-amber-100'
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}
          >
            <Icon
              name={
                validationInfo.status === 'success'
                  ? 'CheckCircle'
                  : validationInfo.status === 'expired'
                  ? 'Clock'
                  : 'AlertTriangle'
              }
              size={16}
              className="shrink-0 mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <span>{validationInfo.message}</span>
              {validationInfo.expTime && (
                <span className="text-[10px] font-medium text-slate-500 mt-1">
                  • 签发时间: {validationInfo.iatTime || '未设置'}
                  <br />• 过期时间: {validationInfo.expTime}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Decoded view - right */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Eye" size={16} />
              </span>
              本地 JSON 结构解析
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            {/* Header section */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                HEADER (标头 - 算法与签名类型)
              </span>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs text-rose-700 font-medium whitespace-pre-wrap max-h-[140px] overflow-auto">
                {headerJson || '{\n  "alg": "等待输入",\n  "typ": "JWT"\n}'}
              </div>
            </div>

            {/* Payload section */}
            <div className="flex-1 flex flex-col min-h-[180px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  PAYLOAD (载荷 - 声明与自定数据)
                </span>
                {payloadJson && <SendToToolButton data={payloadJson} label="发送到" />}
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs text-sky-700 font-medium whitespace-pre-wrap overflow-auto flex-1 max-h-[300px]">
                {payloadJson || '{\n  "sub": "等待输入",\n  "name": "待解析"\n}'}
              </div>
            </div>

            {/* Signature section */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                SIGNATURE (验证签名 HASH)
              </span>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-[11px] text-emerald-700 font-semibold break-all whitespace-pre-wrap">
                {signatureHex || '等待输入 Token ...'}
              </div>
            </div>
          </div>
        </div>

        {/* Security assurance */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">🛡️ 本地安全解析声明：</p>
          JWT 是一种自包含、仅由 Base64 编码的对称/非对称安全凭证。此工具<strong>完全在本地浏览器沙箱中解码和还原</strong>，绝不上传您的 API 敏感参数或业务 Token 至任何网络服务器，保障企业系统权限秘钥万无一失。
        </div>
      </div>
    </div>
  );
};
