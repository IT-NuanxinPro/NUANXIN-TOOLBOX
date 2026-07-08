import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

// Simple pure-JS implementation of MD5 for full iframe/local compatibility
function md5(str: string): string {
  let k = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ];
  let r = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20, 5,  9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;

  let utf8 = unescape(encodeURIComponent(str));
  let words = new Uint32Array(((utf8.length + 8) >> 6) + 1 << 4);
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= utf8.charCodeAt(i) << ((i % 4) << 3);
  }
  words[utf8.length >> 2] |= 0x80 << ((utf8.length % 4) << 3);
  words[words.length - 2] = utf8.length * 8;

  for (let j = 0; j < words.length; j += 16) {
    let a = h0, b = h1, c = h2, d = h3;
    for (let i = 0; i < 64; i++) {
      let f, g;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      let temp = d;
      d = c;
      c = b;
      b = (b + rotateLeft((a + f + k[i] + words[j + g]), r[i])) | 0;
      a = temp;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
  }

  function rotateLeft(l: number, s: number) {
    return (l << s) | (l >>> (32 - s));
  }

  function hex(n: number) {
    let s = "", v;
    for (let i = 0; i < 4; i++) {
      v = (n >> (i * 8 + 4)) & 0xf;
      s += v.toString(16);
      v = (n >> (i * 8)) & 0xf;
      s += v.toString(16);
    }
    return s;
  }
  return hex(h0) + hex(h1) + hex(h2) + hex(h3);
}

// Simple SHA-1 Implementation
async function sha1(str: string): Promise<string> {
  try {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return "Web Crypto 未启用（SHA-1 需要安全上下文）";
  }
}

// Simple SHA-256 Implementation
async function sha256(str: string): Promise<string> {
  try {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return "Web Crypto 未启用（SHA-256 需要安全上下文）";
  }
}

// HTML Entities Encoder/Decoder
const htmlEncode = (text: string) => {
  return text.replace(/[\u00A0-\u9999<>&]/g, (i) => `&#${i.charCodeAt(0)};`);
};

const htmlDecode = (text: string) => {
  const doc = new DOMParser().parseFromString(text, "text/html");
  return doc.documentElement.textContent || "";
};

export const HashCrypto: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [inputText, setInputText] = useState<string>('Hello, World! 🚀');
  const [md5Output, setMd5Output] = useState<string>('');
  const [sha1Output, setSha1Output] = useState<string>('');
  const [sha256Output, setSha256Output] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // URL Encode/Decode Area State
  const [urlInput, setUrlInput] = useState<string>('https://ai.studio/build?query=本地工具箱&status=active');
  const [urlEncoded, setUrlEncoded] = useState<string>('');
  const [urlDecoded, setUrlDecoded] = useState<string>('');

  // HTML Entity State
  const [htmlInput, setHtmlInput] = useState<string>('<div>"Hello" & <World></div>');
  const [htmlEncoded, setHtmlEncoded] = useState<string>('');
  const [htmlDecoded, setHtmlDecoded] = useState<string>('');

  useEffect(() => {
    // Generate Hashes
    setMd5Output(md5(inputText));
    sha1(inputText).then(setSha1Output);
    sha256(inputText).then(setSha256Output);
  }, [inputText]);

  useEffect(() => {
    try {
      setUrlEncoded(encodeURIComponent(urlInput));
    } catch {
      setUrlEncoded('URL 编码失败 (格式错误)');
    }
    try {
      setUrlDecoded(decodeURIComponent(urlInput));
    } catch {
      setUrlDecoded('URL 解码失败 (格式错误)');
    }
  }, [urlInput]);

  useEffect(() => {
    setHtmlEncoded(htmlEncode(htmlInput));
    setHtmlDecoded(htmlDecode(htmlInput));
  }, [htmlInput]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
    onRecordUsage();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Hash Computing Panel (Left/Main) */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Icon name="Hash" className="text-slate-900" size={16} />
              哈希散列计算器
            </h4>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">
              单向不可逆哈希
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">输入原始文本内容</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="在这里输入需要计算 HASH 散列的字符串..."
              rows={3}
              className="w-full text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-950 font-mono text-slate-800"
            />
          </div>

          {/* Hash Outputs */}
          <div className="flex flex-col gap-4">
            
            {/* MD5 Output */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-500">MD5 (128位 - 32位字符)</span>
                <button
                  onClick={() => handleCopy(md5Output, 'md5')}
                  className="text-[10px] text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Icon name={copiedKey === 'md5' ? 'Check' : 'Copy'} size={11} />
                  {copiedKey === 'md5' ? '已复制' : '复制'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={md5Output}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 font-semibold focus:outline-hidden"
              />
            </div>

            {/* SHA-1 Output */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-500">SHA-1 (160位 - 40位字符)</span>
                <button
                  onClick={() => handleCopy(sha1Output, 'sha1')}
                  className="text-[10px] text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Icon name={copiedKey === 'sha1' ? 'Check' : 'Copy'} size={11} />
                  {copiedKey === 'sha1' ? '已复制' : '复制'}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={sha1Output}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 font-semibold focus:outline-hidden"
              />
            </div>

            {/* SHA-256 Output */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-500">SHA-256 (256位 - 64位字符)</span>
                <button
                  onClick={() => handleCopy(sha256Output, 'sha256')}
                  className="text-[10px] text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Icon name={copiedKey === 'sha256' ? 'Check' : 'Copy'} size={11} />
                  {copiedKey === 'sha256' ? '已复制' : '复制'}
                </button>
              </div>
              <textarea
                readOnly
                rows={2}
                value={sha256Output}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 font-semibold focus:outline-hidden resize-none"
              />
            </div>

          </div>
        </div>
      </div>

      {/* Encoding & Utility Panel (Right) */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        
        {/* URL Encode/Decode */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Icon name="Link" className="text-slate-900" size={16} />
              URL 链接编解码
            </h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">输入待处理的 URL 文本</label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-950"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-400">组件编码 (UrlEncoded)</span>
                <button
                  onClick={() => handleCopy(urlEncoded, 'urlEnc')}
                  className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                >
                  {copiedKey === 'urlEnc' ? '已复制' : '复制'}
                </button>
              </div>
              <textarea
                readOnly
                value={urlEncoded}
                rows={3}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-hidden resize-none leading-normal"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-400">原始还原 (UrlDecoded)</span>
                <button
                  onClick={() => handleCopy(urlDecoded, 'urlDec')}
                  className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                >
                  {copiedKey === 'urlDec' ? '已复制' : '复制'}
                </button>
              </div>
              <textarea
                readOnly
                value={urlDecoded}
                rows={3}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-hidden resize-none leading-normal"
              />
            </div>
          </div>
        </div>

        {/* HTML Entities Encode/Decode */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Icon name="FileCode" className="text-slate-900" size={16} />
              HTML 实体转义编码
            </h4>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">输入 HTML 网页文本</label>
            <input
              type="text"
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-950"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-400">实体转义 (HtmlEncoded)</span>
                <button
                  onClick={() => handleCopy(htmlEncoded, 'htmlEnc')}
                  className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                >
                  {copiedKey === 'htmlEnc' ? '已复制' : '复制'}
                </button>
              </div>
              <textarea
                readOnly
                value={htmlEncoded}
                rows={3}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-hidden resize-none leading-normal"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-400">反转义还原 (HtmlDecoded)</span>
                <button
                  onClick={() => handleCopy(htmlDecoded, 'htmlDec')}
                  className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
                >
                  {copiedKey === 'htmlDec' ? '已复制' : '复制'}
                </button>
              </div>
              <textarea
                readOnly
                value={htmlDecoded}
                rows={3}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-hidden resize-none leading-normal"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
