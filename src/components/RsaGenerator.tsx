import React, { useState } from 'react';
import { Icon } from './Icon';

interface RsaGeneratorProps {
  onRecordUsage: () => void;
}

export const RsaGenerator: React.FC<RsaGeneratorProps> = ({ onRecordUsage }) => {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'openssl'>('sandbox');

  // --- TAB 1: WEB CRYPTO SANDBOX STATE ---
  const [keySize, setKeySize] = useState<number>(2048);
  const [publicKeyPem, setPublicKeyPem] = useState<string>('');
  const [privateKeyPem, setPrivateKeyPem] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Encrypt / Decrypt State
  const [encryptTarget, setEncryptTarget] = useState<string>('public');
  const [inputText, setInputText] = useState<string>('');
  const [cryptoKeyString, setCryptoKeyString] = useState<string>('');
  const [outputResult, setOutputResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<'pub' | 'pri' | 'out' | null>(null);

  // --- TAB 2: OPENSSL STATE ---
  const [rsaAction, setRsaAction] = useState<'generate' | 'pkcs1_to_pkcs8' | 'pkcs8_to_pkcs1' | 'extract_pub_pkcs8' | 'extract_pub_pkcs1' | 'encrypt_key' | 'decrypt_key'>('generate');
  const [rsaKeySize, setRsaKeySize] = useState<number>(2048);
  const [rsaInputFile, setRsaInputFile] = useState<string>('private.key');
  const [rsaOutputFile, setRsaOutputFile] = useState<string>('public.pem');
  const [rsaPassword, setRsaPassword] = useState<string>('MyPass123');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Helper: arrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const base64ToArrayBuffer = (b64: string): ArrayBuffer => {
    const binaryString = window.atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // PEM Helpers
  const formatAsPem = (base64: string, isPrivate: boolean): string => {
    const header = isPrivate ? '-----BEGIN PRIVATE KEY-----' : '-----BEGIN PUBLIC KEY-----';
    const footer = isPrivate ? '-----END PRIVATE KEY-----' : '-----END PUBLIC KEY-----';
    const regex = /.{1,64}/g;
    const lines = base64.match(regex) || [base64];
    return `${header}\n${lines.join('\n')}\n${footer}`;
  };

  // Generate RSA Key Pair
  const generateKeys = async () => {
    onRecordUsage();
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: keySize,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
          hash: { name: 'SHA-256' },
        },
        true, // exportable
        ['encrypt', 'decrypt']
      );

      // Export Public Key
      const exportedPublic = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicB64 = arrayBufferToBase64(exportedPublic);
      const pubPem = formatAsPem(publicB64, false);
      setPublicKeyPem(pubPem);

      // Export Private Key
      const exportedPrivate = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateB64 = arrayBufferToBase64(exportedPrivate);
      const priPem = formatAsPem(privateB64, true);
      setPrivateKeyPem(priPem);

      // Sync to encryption panel automatically
      setCryptoKeyString(pubPem);
    } catch (err: any) {
      setErrorMsg('生成密钥对失败: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clean PEM wrappers
  const cleanPem = (pem: string): string => {
    return pem
      .replace(/-----BEGIN[A-Z ]+-----/g, '')
      .replace(/-----END[A-Z ]+-----/g, '')
      .replace(/\s+/g, '');
  };

  // Handle Encryption / Decryption
  const handleCryptoOperation = async (mode: 'encrypt' | 'decrypt') => {
    onRecordUsage();
    setErrorMsg(null);
    setOutputResult('');

    if (!inputText.trim()) {
      setErrorMsg('请输入待处理的内容文本');
      return;
    }
    if (!cryptoKeyString.trim()) {
      setErrorMsg('请输入或生成用于处理的 RSA 密钥 (PEM 格式)');
      return;
    }

    try {
      const cleanedKeyB64 = cleanPem(cryptoKeyString);
      const keyBuffer = base64ToArrayBuffer(cleanedKeyB64);

      if (mode === 'encrypt') {
        // Import Public Key
        const pubKey = await window.crypto.subtle.importKey(
          'spki',
          keyBuffer,
          {
            name: 'RSA-OAEP',
            hash: { name: 'SHA-256' },
          },
          false,
          ['encrypt']
        );

        const enc = new TextEncoder();
        const data = enc.encode(inputText);
        const encryptedBuffer = await window.crypto.subtle.encrypt(
          { name: 'RSA-OAEP' },
          pubKey,
          data
        );

        setOutputResult(arrayBufferToBase64(encryptedBuffer));
      } else {
        // Import Private Key
        const priKey = await window.crypto.subtle.importKey(
          'pkcs8',
          keyBuffer,
          {
            name: 'RSA-OAEP',
            hash: { name: 'SHA-256' },
          },
          false,
          ['decrypt']
        );

        const dataToDecrypt = base64ToArrayBuffer(inputText);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: 'RSA-OAEP' },
          priKey,
          dataToDecrypt
        );

        const dec = new TextDecoder();
        setOutputResult(dec.decode(decryptedBuffer));
      }
    } catch (err: any) {
      setErrorMsg(`操作失败: 请检查输入的文本或密钥 PEM 格式是否正确 (${err.message})`);
    }
  };

  const handleCopyText = (text: string, flag: 'pub' | 'pri' | 'out') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(flag);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- OPENSSL FORMULAS & GENERATORS ---
  const generateRsaCommand = () => {
    switch (rsaAction) {
      case 'generate':
        return `openssl genrsa -out ${rsaInputFile} ${rsaKeySize}`;
      case 'pkcs1_to_pkcs8':
        return `openssl pkcs8 -topk8 -inform PEM -in ${rsaInputFile} -outform PEM -out ${rsaOutputFile} -nocrypt`;
      case 'pkcs8_to_pkcs1':
        return `openssl rsa -in ${rsaInputFile} -out ${rsaOutputFile}`;
      case 'extract_pub_pkcs8':
        return `openssl rsa -in ${rsaInputFile} -pubout -out ${rsaOutputFile}`;
      case 'extract_pub_pkcs1':
        return `openssl rsa -in ${rsaInputFile} -RSAPublicKey_out -out ${rsaOutputFile}`;
      case 'encrypt_key':
        return `openssl rsa -in ${rsaInputFile} -aes256 -out ${rsaOutputFile} -passout pass:${rsaPassword}`;
      case 'decrypt_key':
        return `openssl rsa -in ${rsaInputFile} -out ${rsaOutputFile} -passin pass:${rsaPassword}`;
      default:
        return '';
    }
  };

  const getRsaExplanation = () => {
    switch (rsaAction) {
      case 'generate':
        return [
          { cmd: 'genrsa', desc: 'OpenSSL 生成 RSA 非对称私钥的子命令。' },
          { cmd: `-out ${rsaInputFile}`, desc: '生成的私钥文件输出路径/文件名。' },
          { cmd: rsaKeySize.toString(), desc: '非对称密钥的二进制位长度。' },
        ];
      case 'pkcs1_to_pkcs8':
        return [
          { cmd: 'pkcs8', desc: '处理 PKCS#8 格式标准密钥的通用子命令。' },
          { cmd: '-topk8', desc: '强制将输入的传统私钥转换为 PKCS#8 标准格式。' },
          { cmd: `-in ${rsaInputFile}`, desc: '输入的源 PKCS#1 传统私钥文件名。' },
          { cmd: `-out ${rsaOutputFile}`, desc: '转换后的标准 PKCS#8 私钥输出文件名。' },
          { cmd: '-nocrypt', desc: '不对生成的标准私钥进行密码对称加密（即保持免密私钥）。' },
        ];
      case 'pkcs8_to_pkcs1':
        return [
          { cmd: 'rsa', desc: '专门用来管理和转换 RSA 密钥的子命令。' },
          { cmd: `-in ${rsaInputFile}`, desc: '输入的 PKCS#8 格式私钥。' },
          { cmd: `-out ${rsaOutputFile}`, desc: '转换输出回 PKCS#1 (BEGIN RSA PRIVATE KEY) 传统格式。' },
        ];
      case 'extract_pub_pkcs8':
        return [
          { cmd: '-pubout', desc: '表明我们要导出的不是私钥，而是对应的公钥（BEGIN PUBLIC KEY）。' },
          { cmd: `-in ${rsaInputFile}`, desc: '读取的对应私钥源文件。' },
          { cmd: `-out ${rsaOutputFile}`, desc: '导出的标准 PKCS#8 公钥文件。' },
        ];
      case 'extract_pub_pkcs1':
        return [
          { cmd: '-RSAPublicKey_out', desc: '强制指定导出的公钥采用旧式的 PKCS#1 (BEGIN RSA PUBLIC KEY) 规范。' },
          { cmd: `-in ${rsaInputFile}`, desc: '读取的对应私钥源文件。' },
          { cmd: `-out ${rsaOutputFile}`, desc: '导出的 PKCS#1 公钥文件。' },
        ];
      case 'encrypt_key':
        return [
          { cmd: '-aes256', desc: '启用强度极高的 AES-255 算法，强制对导出的私钥数据体进行密码口令对称加密。' },
          { cmd: `-passout pass:${rsaPassword}`, desc: '密码源。指定密码作为私钥的对称加密保护钥匙。' },
        ];
      case 'decrypt_key':
        return [
          { cmd: `-passin pass:${rsaPassword}`, desc: '输入口令。解密先前被加密锁定的私钥文件，恢复其免密部署状态。' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Tab Navigation header */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('sandbox'); onRecordUsage(); }}
          className={`px-5 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'sandbox'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icon name="Shield" size={14} />
          浏览器加解密沙盒 (Web Crypto API)
        </button>
        <button
          onClick={() => { setActiveTab('openssl'); onRecordUsage(); }}
          className={`px-5 py-2.5 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'openssl'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icon name="Terminal" size={14} />
          OpenSSL 密钥格式转换与命令生成
        </button>
      </div>

      {/* --- TAB 1: WEB CRYPTO SANDBOX --- */}
      {activeTab === 'sandbox' && (
        <div id="rsa-generator-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Parameters Panel */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="Sliders" className="text-slate-900" size={16} />
              RSA 密钥对生成
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">密钥长度 (Key Size)</label>
              <div className="grid grid-cols-3 gap-2">
                {[1024, 2048, 4096].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setKeySize(size)}
                    className={`text-xs py-1.5 font-bold rounded-md transition-all cursor-pointer border ${
                      keySize === size
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {size} bit {size === 2048 ? '(推荐)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateKeys}
              disabled={isGenerating}
              className="w-full mt-2 cursor-pointer bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold py-2.5 rounded-md transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:bg-slate-400"
            >
              <Icon name="RefreshCw" size={12} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? '正在生成强密钥对...' : '一键生成高安全密钥对'}
            </button>

            {/* Public & Private PEM Fields */}
            {publicKeyPem && (
              <div className="flex flex-col gap-3 mt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500">公钥 (Public Key PEM - 用于加密)</span>
                    <button
                      onClick={() => handleCopyText(publicKeyPem, 'pub')}
                      className="text-[10px] text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name={copiedKey === 'pub' ? 'Check' : 'Copy'} size={10} />
                      {copiedKey === 'pub' ? '已复制' : '复制公钥'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={publicKeyPem}
                    rows={5}
                    className="w-full text-[10px] font-mono bg-slate-50 text-slate-600 border border-slate-200 p-2.5 rounded-lg outline-hidden resize-none leading-normal"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500">私钥 (Private Key PEM - 用于解密)</span>
                    <button
                      onClick={() => handleCopyText(privateKeyPem, 'pri')}
                      className="text-[10px] text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name={copiedKey === 'pri' ? 'Check' : 'Copy'} size={10} />
                      {copiedKey === 'pri' ? '已复制' : '复制私钥'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={privateKeyPem}
                    rows={5}
                    className="w-full text-[10px] font-mono bg-slate-50 text-slate-600 border border-slate-200 p-2.5 rounded-lg outline-hidden resize-none leading-normal"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Crypto Process Panel */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                  <Icon name="Lock" size={16} />
                </span>
                RSA 加解密测试沙盒
              </h4>

              {/* Alert Message */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <Icon name="AlertTriangle" size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Key Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">粘贴 RSA 密钥 (PEM 格式)</label>
                  {publicKeyPem && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCryptoKeyString(publicKeyPem);
                          setEncryptTarget('public');
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                      >
                        导入自生公钥
                      </button>
                      <button
                        onClick={() => {
                          setCryptoKeyString(privateKeyPem);
                          setEncryptTarget('private');
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                      >
                        导入自生私钥
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  value={cryptoKeyString}
                  onChange={(e) => setCryptoKeyString(e.target.value)}
                  placeholder="在此粘贴以 -----BEGIN ... 开头的 RSA 密钥 PEM 文本..."
                  rows={4}
                  className="w-full text-[10px] font-mono bg-slate-50 border border-slate-200 p-3 rounded-lg outline-hidden focus:ring-1 focus:ring-black resize-none text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Input Text Area */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600">待处理的输入文本 (Input Data)</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="普通明文（加密时）或 Base64 密文（解密时）..."
                    rows={5}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 p-3 rounded-lg outline-hidden focus:ring-1 focus:ring-black resize-none text-slate-800"
                  />
                </div>

                {/* Output Result Area */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">计算输出结果 (Output)</label>
                    {outputResult && (
                      <button
                        onClick={() => handleCopyText(outputResult, 'out')}
                        className="text-[10px] text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Icon name={copiedKey === 'out' ? 'Check' : 'Copy'} size={10} />
                        {copiedKey === 'out' ? '已复制' : '复制结果'}
                      </button>
                    )}
                  </div>
                  <textarea
                    readOnly
                    value={outputResult}
                    placeholder="此处显示 RSA 运算后的结果输出..."
                    rows={5}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 p-3 rounded-lg outline-hidden resize-none text-slate-800"
                  />
                </div>
              </div>

              {/* Run Actions */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  onClick={() => handleCryptoOperation('encrypt')}
                  className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icon name="ShieldAlert" size={14} />
                  公钥加密 (RSA-OAEP)
                </button>
                <button
                  onClick={() => handleCryptoOperation('decrypt')}
                  className="w-full py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icon name="ShieldCheck" size={14} />
                  私钥解密 (RSA-OAEP)
                </button>
              </div>
            </div>

            {/* Local Security Tip */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-700 mb-1">🛠️ 技术标准与原理：</p>
              此工具采用最新的 <strong>Web Crypto API</strong> 在本地渲染，公/私钥算法遵循 PKCS#8 与 SPKI 的 PEM 格式标准。加密填充方案使用高度抗攻击的 <strong>RSA-OAEP + SHA-256</strong>，最大程度保证加解密的数学抗安全强度。
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: OPENSSL KEY FORMAT CONVERTER --- */}
      {activeTab === 'openssl' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Settings Left Column - 5 cols */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="Sliders" className="text-slate-900" size={16} />
              RSA 格式转换配置
            </h4>

            {/* Step 1: Select Operation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">1. 选择 OpenSSL 密钥操作</label>
              <select
                value={rsaAction}
                onChange={(e) => { setRsaAction(e.target.value as any); onRecordUsage(); }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-bold text-slate-800 focus:ring-1 focus:ring-black outline-none"
              >
                <option value="generate">🔑 生成全新 RSA 私钥 (genrsa)</option>
                <option value="pkcs1_to_pkcs8">🔄 PKCS#1 转换为 PKCS#8 (标准私钥)</option>
                <option value="pkcs8_to_pkcs1">🔄 PKCS#8 转换为 PKCS#1 (传统私钥)</option>
                <option value="extract_pub_pkcs8">📤 导出 PKCS#8 格式公钥 (BEGIN PUBLIC KEY)</option>
                <option value="extract_pub_pkcs1">📤 导出 PKCS#1 格式公钥 (BEGIN RSA PUBLIC KEY)</option>
                <option value="encrypt_key">🔒 使用口令/密码加密保护私钥 (AES-256)</option>
                <option value="decrypt_key">🔓 解密已加密保护的私钥 (免密部署)</option>
              </select>
            </div>

            {/* Conditional: Key size */}
            {rsaAction === 'generate' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">密钥位长度 (Bits Size)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2048, 3072, 4096].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setRsaKeySize(size); onRecordUsage(); }}
                      className={`text-xs py-1.5 rounded-md font-bold text-center border cursor-pointer transition-all ${
                        rsaKeySize === size
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {size} 位
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-medium block mt-1.5 font-sans">说明：2048 位为当前安全底线，4096 位提供超长安全寿命。</span>
              </div>
            )}

            {/* Input file name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {rsaAction === 'generate' ? '输出私钥文件名' : '输入源密钥文件名'}
              </label>
              <input
                type="text"
                value={rsaInputFile}
                onChange={(e) => setRsaInputFile(e.target.value)}
                placeholder="例如: private.key"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-mono font-bold text-slate-800 focus:ring-1 focus:ring-black outline-none"
              />
            </div>

            {/* Output file name */}
            {rsaAction !== 'generate' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">导出目标文件名</label>
                <input
                  type="text"
                  value={rsaOutputFile}
                  onChange={(e) => setRsaOutputFile(e.target.value)}
                  placeholder="例如: public_pkcs8.pem"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-mono font-bold text-slate-800 focus:ring-1 focus:ring-black outline-none"
                />
              </div>
            )}

            {/* Password input */}
            {(rsaAction === 'encrypt_key' || rsaAction === 'decrypt_key') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">私钥加密/解密密码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center text-slate-400">
                    <Icon name="Lock" size={13} />
                  </div>
                  <input
                    type="text"
                    value={rsaPassword}
                    onChange={(e) => setRsaPassword(e.target.value)}
                    placeholder="请输入临时密码..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-8 pr-2.5 font-mono font-bold text-slate-800 focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
              </div>
            )}

            {/* Quick Presets for RSA knowledge */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mt-1 font-sans">
              <h5 className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Icon name="HelpCircle" size={12} className="text-slate-500" />
                常见开发框架密钥格式诉求
              </h5>
              <div className="text-[10px] text-slate-500 space-y-1.5 font-medium leading-relaxed">
                <p>💡 <strong className="text-slate-800">Java / Spring Security</strong>：强制必须使用 <strong className="text-indigo-600 font-bold">PKCS#8</strong> 格式私钥。</p>
                <p>💡 <strong className="text-slate-800">Node.js (jsonwebtoken)</strong>：同时支持 PKCS#1 / PKCS#8，推荐使用标准 <strong className="text-indigo-600 font-bold">PKCS#8</strong>。</p>
                <p>💡 <strong className="text-slate-800">Nginx / SSL 证书私钥</strong>：通常采用传统的 <strong className="text-indigo-600 font-bold">PKCS#1</strong> 格式私钥。</p>
              </div>
            </div>

          </div>

          {/* Interactive Preview Right Column - 7 cols */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Command Display Terminal Card */}
            <div className="bg-slate-900 rounded-xl border border-slate-950 overflow-hidden shadow-md flex flex-col">
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-2 font-mono">
                  <Icon name="Terminal" size={14} className="text-emerald-500" />
                  OPENSSL_RSA_COMMAND
                </span>
                <button
                  onClick={() => handleCopy(generateRsaCommand())}
                  className="text-[11px] bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-500/10"
                >
                  <Icon name={copiedText === generateRsaCommand() ? 'Check' : 'Copy'} size={12} />
                  {copiedText === generateRsaCommand() ? '已复制' : '复制命令'}
                </button>
              </div>

              {/* Terminal Code Body */}
              <div className="p-5 font-mono text-sm leading-relaxed text-emerald-300 bg-slate-950 whitespace-pre-wrap select-all">
                {generateRsaCommand()}
              </div>
            </div>

            {/* Instruction / Step by step details */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs font-sans">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Icon name="Compass" className="text-slate-500" size={16} />
                参数释义与执行步骤分解
              </h4>

              <div className="flex flex-col gap-4 mt-4">
                {getRsaExplanation().map((step, idx) => (
                  <div key={idx} className="flex gap-4 items-start text-xs leading-relaxed">
                    <span className="font-mono bg-slate-100 text-slate-800 border border-slate-200 rounded-md px-2 py-0.5 whitespace-nowrap font-bold">
                      参数 {idx + 1}
                    </span>
                    <div className="flex-1">
                      <code className="text-slate-900 font-mono font-bold bg-slate-50 px-1.5 py-0.5 rounded-sm break-all">
                        {step.cmd}
                      </code>
                      <p className="text-slate-500 mt-1 font-medium">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Format Identification Table */}
            <div className="bg-slate-900 rounded-xl border border-slate-950 p-5 text-slate-300 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-sans">
                <Icon name="Shield" size={14} className="text-emerald-500" />
                核心密钥格式特征「肉眼识别表」 (PEM Recognition Guide)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium font-sans">根据 PEM 文件的首行和尾行标识字符进行精准断定：</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 pr-4 font-bold">密钥格式标准</th>
                      <th className="py-2 pr-4 font-bold">PEM 文本首行标记 (Header)</th>
                      <th className="py-2 pr-4 font-bold">典型适配运行场景 / 作用</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-slate-300">
                    <tr>
                      <td className="py-2.5 pr-4 font-bold text-emerald-400">PKCS#1 私钥</td>
                      <td className="py-2.5 pr-4 font-bold text-white">-----BEGIN RSA PRIVATE KEY-----</td>
                      <td className="py-2.5 pr-4 text-slate-400 font-sans font-medium">Nginx Web 容器、传统的 C++ / Python 服务组件</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-bold text-emerald-400">PKCS#8 私钥</td>
                      <td className="py-2.5 pr-4 font-bold text-white">-----BEGIN PRIVATE KEY-----</td>
                      <td className="py-2.5 pr-4 text-slate-400 font-sans font-medium">Java / Spring Boot 默认标准、现代主流后端架构与安全加密库</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-bold text-emerald-400">PKCS#1 公钥</td>
                      <td className="py-2.5 pr-4 font-bold text-white">-----BEGIN RSA PUBLIC KEY-----</td>
                      <td className="py-2.5 pr-4 text-slate-400 font-sans font-medium">旧版公钥格式，仅含 RSA 算法规范结构</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-bold text-emerald-400">PKCS#8 公钥</td>
                      <td className="py-2.5 pr-4 font-bold text-white">-----BEGIN PUBLIC KEY-----</td>
                      <td className="py-2.5 pr-4 text-slate-400 font-sans font-medium">国际通用公钥格式，带算法标识符，支持更全面的加密套件</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-bold text-amber-400">SSH 客户端公钥</td>
                      <td className="py-2.5 pr-4 font-bold text-white">ssh-rsa AAAAB3NzaC1yc...</td>
                      <td className="py-2.5 pr-4 text-slate-400 font-sans font-medium">保存在 ~/.ssh/authorized_keys 中用作远程 Linux 主机免密登录</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
