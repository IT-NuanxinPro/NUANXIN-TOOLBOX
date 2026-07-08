import React, { useState } from 'react';
import CryptoJS from 'crypto-js';
import { Icon } from './Icon';

interface AesCryptoProps {
  onRecordUsage: () => void;
}

export const AesCrypto: React.FC<AesCryptoProps> = ({ onRecordUsage }) => {
  const [mode, setMode] = useState<string>('CBC');
  const [padding, setPadding] = useState<string>('Pkcs7');
  const [keySize, setKeySize] = useState<number>(256); // 128, 192, 256
  const [secretKey, setSecretKey] = useState<string>('NuAnXinToolboxKey2026!Awesome');
  const [iv, setIv] = useState<string>('1234567890123456');
  const [keyEncoding, setKeyEncoding] = useState<string>('utf8'); // utf8, hex, base64
  const [outputFormat, setOutputFormat] = useState<string>('base64'); // base64, hex
  
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Generate random keys/iv
  const generateRandomKey = () => {
    onRecordUsage();
    const len = keySize / 8; // bytes length
    const words = CryptoJS.lib.WordArray.random(len);
    setSecretKey(words.toString(CryptoJS.enc.Hex));
    setKeyEncoding('hex'); // switch to hex encoding for random hex
  };

  const generateRandomIv = () => {
    onRecordUsage();
    const words = CryptoJS.lib.WordArray.random(16); // IV is always 16 bytes for AES
    setIv(words.toString(CryptoJS.enc.Hex));
  };

  const handleCrypto = (action: 'encrypt' | 'decrypt') => {
    onRecordUsage();
    setErrorMsg(null);
    setOutputText('');

    if (!inputText.trim()) {
      setErrorMsg('请输入待处理的内容文本');
      return;
    }

    if (!secretKey) {
      setErrorMsg('密钥 (Key) 不能为空');
      return;
    }

    try {
      // Parse Key
      let parsedKey: CryptoJS.lib.WordArray;
      if (keyEncoding === 'utf8') {
        parsedKey = CryptoJS.enc.Utf8.parse(secretKey);
      } else if (keyEncoding === 'hex') {
        parsedKey = CryptoJS.enc.Hex.parse(secretKey);
      } else {
        parsedKey = CryptoJS.enc.Base64.parse(secretKey);
      }

      // Parse IV (only needed if mode is not ECB)
      let parsedIv: CryptoJS.lib.WordArray | undefined;
      if (mode !== 'ECB') {
        if (!iv) {
          setErrorMsg(`${mode} 模式下必须设置初始向量 (IV)`);
          return;
        }
        // IV usually has 16 bytes, can be hex or utf8
        parsedIv = iv.length === 32 && /^[0-9a-fA-F]+$/.test(iv)
          ? CryptoJS.enc.Hex.parse(iv)
          : CryptoJS.enc.Utf8.parse(iv);
      }

      // Map options
      const cryptoMode = (CryptoJS.mode as any)[mode] || CryptoJS.mode.CBC;
      const cryptoPadding = (CryptoJS.pad as any)[padding] || CryptoJS.pad.Pkcs7;

      const options: any = {
        mode: cryptoMode,
        padding: cryptoPadding,
      };
      if (parsedIv) {
        options.iv = parsedIv;
      }

      if (action === 'encrypt') {
        const encrypted = CryptoJS.AES.encrypt(inputText, parsedKey, options);
        let result = '';
        if (outputFormat === 'base64') {
          result = encrypted.toString(); // Defaults to base64
        } else {
          result = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
        }
        setOutputText(result);
      } else {
        // For decryption, CryptoJS.AES.decrypt takes a cipherParams or base64 string
        let cipherParams: any;
        if (outputFormat === 'hex') {
          // If input is hex, parse it to WordArray first, then build cipherParams
          const ciphertextBytes = CryptoJS.enc.Hex.parse(inputText);
          cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: ciphertextBytes,
          });
        } else {
          cipherParams = inputText;
        }

        const decrypted = CryptoJS.AES.decrypt(cipherParams, parsedKey, options);
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (!result) {
          throw new Error('解密结果为空，请检查密钥、向量、模式及填充是否正确匹配。');
        }
        setOutputText(result);
      }
    } catch (err: any) {
      setErrorMsg(`操作失败: ${err.message || '格式错误，无法解密，请核对所有加密参数。'}`);
    }
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div id="aes-crypto-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Parameters Panel */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Sliders" className="text-slate-900" size={16} />
          AES 加密核心参数配置
        </h4>

        {/* Algorithm Size & Format */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">密钥位数 (Key Size)</label>
            <select
              value={keySize}
              onChange={(e) => setKeySize(parseInt(e.target.value))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
            >
              <option value="128">AES-128</option>
              <option value="192">AES-192</option>
              <option value="256">AES-256 (高强度安全)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">工作模式 (Mode)</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
            >
              <option value="CBC">CBC (密码分组链接 - 推荐)</option>
              <option value="ECB">ECB (电子密码本 - 无IV)</option>
              <option value="CFB">CFB (密码反馈)</option>
              <option value="OFB">OFB (输出反馈)</option>
              <option value="CTR">CTR (计数器模式)</option>
            </select>
          </div>
        </div>

        {/* Padding and Output Format */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">填充模式 (Padding)</label>
            <select
              value={padding}
              onChange={(e) => setPadding(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
            >
              <option value="Pkcs7">PKCS7 / PKCS5 (推荐)</option>
              <option value="ZeroPadding">ZeroPadding (零填充)</option>
              <option value="NoPadding">NoPadding (无填充 - 数据须分组对齐)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">密文展现格式</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
            >
              <option value="base64">Base64 字符串</option>
              <option value="hex">HEX 十六进制 (32位小写)</option>
            </select>
          </div>
        </div>

        {/* Secret Key Input & Encoding */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600">自定义密钥 (Key)</label>
              <button
                onClick={generateRandomKey}
                className="text-[10px] text-slate-800 font-bold hover:underline cursor-pointer"
              >
                生成随机密钥
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="在此输入您的对称密钥字符串..."
                className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
              />
              <select
                value={keyEncoding}
                onChange={(e) => setKeyEncoding(e.target.value)}
                className="text-[10px] bg-slate-100 border border-slate-200 rounded-md px-1.5 font-bold text-slate-700"
              >
                <option value="utf8">UTF-8</option>
                <option value="hex">HEX 格式</option>
                <option value="base64">Base64</option>
              </select>
            </div>
          </div>

          {/* IV Input (only for non-ECB) */}
          {mode !== 'ECB' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600">初始向量 (IV)</label>
                <button
                  onClick={generateRandomIv}
                  className="text-[10px] text-slate-800 font-bold hover:underline cursor-pointer"
                >
                  生成随机 IV
                </button>
              </div>
              <input
                type="text"
                value={iv}
                onChange={(e) => setIv(e.target.value)}
                placeholder="IV 需为 16 字节 (16 位 UTF8 或 32 位 Hex)..."
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
              />
            </div>
          )}
        </div>
      </div>

      {/* Input Output Sandbox Panel */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
              <Icon name="KeyRound" size={16} />
            </span>
            AES 对称加解密沙盒
          </h4>

          {/* Alert Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Icon name="AlertTriangle" size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">待处理输入内容</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="加密时输入普通明文；解密时输入密文 (对应右侧密文格式)..."
                rows={7}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 p-3 rounded-lg outline-hidden focus:ring-1 focus:ring-black resize-none text-slate-800 leading-normal"
              />
            </div>

            {/* Output text */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600">运算计算输出</label>
                {outputText && (
                  <button
                    onClick={handleCopy}
                    className="text-[10px] text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name={isCopied ? 'Check' : 'Copy'} size={10} />
                    {isCopied ? '已复制' : '复制输出'}
                  </button>
                )}
              </div>
              <textarea
                readOnly
                value={outputText}
                placeholder="此处显示 AES 对称计算后的实时结果输出..."
                rows={7}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 p-3 rounded-lg outline-hidden resize-none text-slate-800 leading-normal"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              onClick={() => handleCrypto('encrypt')}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon name="Lock" size={14} />
              执行 AES 加密
            </button>
            <button
              onClick={() => handleCrypto('decrypt')}
              className="w-full py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon name="Unlock" size={14} />
              执行 AES 解密
            </button>
          </div>
        </div>

        {/* Guide */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">🛠️ 加密小百科 (IV & 模式)：</p>
          • <strong>CBC 模式</strong>: 最经典的分组密码工作模式，通过前一个密文分组与当前明文分组异或再加密，安全性极强，强力建议配合 <strong>IV</strong> 向量使用。<br />
          • <strong>ECB 模式</strong>: 将明文分成独立小块逐个加密，由于相同的明文块会生成完全相同的密文，所以容易被推算破解，此模式 <strong>不需要 IV 初始向量</strong>。
        </div>
      </div>
    </div>
  );
};
