import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useToolBridge } from '../hooks/useToolBridge';

interface UrlCodecProps {
  onRecordUsage: () => void;
}

export const UrlCodec: React.FC<UrlCodecProps> = ({ onRecordUsage }) => {
  const [inputText, setInputText] = useState<string>('https://ai.studio/build?utm_source=toolbox&category=dev&tags=react,typescript,vite');
  const [outputText, setOutputText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [parsedParams, setParsedParams] = useState<Array<{ key: string; value: string }>>([]);
  const { pendingTransfer, consumeTransfer } = useToolBridge('url-codec');

  useEffect(() => {
    if (!pendingTransfer) return;
    setInputText(pendingTransfer.data);
    consumeTransfer();
  }, [pendingTransfer, consumeTransfer]);

  const handleEncode = (mode: 'all' | 'component') => {
    onRecordUsage();
    if (!inputText.trim()) return;
    try {
      const result = mode === 'all' ? encodeURI(inputText) : encodeURIComponent(inputText);
      setOutputText(result);
    } catch (err: any) {
      setOutputText(`编码失败: ${err.message}`);
    }
  };

  const handleDecode = () => {
    onRecordUsage();
    if (!inputText.trim()) return;
    try {
      const result = decodeURIComponent(inputText);
      setOutputText(result);
    } catch (err: any) {
      setOutputText(`解码失败: ${err.message}`);
    }
  };

  // Parse URL Parameters
  const handleParseParams = () => {
    onRecordUsage();
    setParsedParams([]);
    if (!inputText.trim()) return;

    try {
      // Find the query part
      let queryStr = inputText;
      if (inputText.includes('?')) {
        queryStr = inputText.split('?')[1];
      }
      if (queryStr.includes('#')) {
        queryStr = queryStr.split('#')[0];
      }

      const params = new URLSearchParams(queryStr);
      const list: Array<{ key: string; value: string }> = [];
      params.forEach((value, key) => {
        list.push({ key, value });
      });

      setParsedParams(list);
      if (list.length > 0) {
        setOutputText(JSON.stringify(Object.fromEntries(params.entries()), null, 2));
      } else {
        setOutputText('未在输入中检测到任何 URL 参数对 (Key=Value)。');
      }
    } catch (err: any) {
      setOutputText(`解析 URL 参数失败: ${err.message}`);
    }
  };

  // Stringify Params back to Query String
  const handleBuildQueryString = () => {
    onRecordUsage();
    if (parsedParams.length === 0) return;
    const params = new URLSearchParams();
    parsedParams.forEach((item) => {
      if (item.key.trim()) {
        params.append(item.key.trim(), item.value);
      }
    });
    setOutputText(params.toString());
  };

  const handleParamChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...parsedParams];
    updated[index][field] = val;
    setParsedParams(updated);
  };

  const handleAddParam = () => {
    setParsedParams([...parsedParams, { key: '', value: '' }]);
  };

  const handleRemoveParam = (index: number) => {
    setParsedParams(parsedParams.filter((_, i) => i !== index));
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div id="url-codec-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Input panel */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Icon name="Link" className="text-slate-900" size={16} />
          URL 字符串输入与计算
        </h4>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600">待处理 URL / 字符参数 (Input)</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="在此处粘贴包含 Query 参数的 URL，或者需要编解码的中文/特殊字符..."
            rows={5}
            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 p-3 rounded-lg outline-hidden focus:ring-1 focus:ring-black resize-none text-slate-800 break-all leading-relaxed"
          />
        </div>

        {/* Action Panel */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleEncode('component')}
            className="text-xs font-bold bg-slate-900 hover:bg-slate-950 text-white py-2 rounded-md transition-all cursor-pointer"
            title="对特殊字符甚至点斜杠进行全部安全转义"
          >
            URL 编码 (Encode)
          </button>
          <button
            onClick={handleDecode}
            className="text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 py-2 rounded-md transition-all cursor-pointer"
          >
            URL 解码 (Decode)
          </button>
        </div>

        <button
          onClick={handleParseParams}
          className="w-full text-xs font-bold bg-slate-50 border border-slate-200 hover:bg-slate-100 py-2.5 rounded-md text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
        >
          <Icon name="Filter" size={12} />
          一键解析提取 URL 参数 (Query String)
        </button>

        {/* Dynamic Query Param Builder */}
        {parsedParams.length > 0 && (
          <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-500">参数对工作台 (Query Key-Value)</span>
              <button
                onClick={handleAddParam}
                className="text-[10px] text-slate-800 font-bold hover:underline"
              >
                + 新增参数
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[160px] overflow-auto pr-1">
              {parsedParams.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item.key}
                    placeholder="Key"
                    onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                    className="w-1/3 text-xs bg-slate-50 border border-slate-200 rounded py-1 px-1.5 font-mono text-slate-700 font-semibold"
                  />
                  <span className="text-slate-400 text-xs">=</span>
                  <input
                    type="text"
                    value={item.value}
                    placeholder="Value"
                    onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded py-1 px-1.5 font-mono text-slate-700"
                  />
                  <button
                    onClick={() => handleRemoveParam(index)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleBuildQueryString}
              className="w-full mt-1 text-xs font-bold bg-slate-900 text-white hover:bg-slate-950 py-1.5 rounded-md transition-all cursor-pointer"
            >
              重新组装并合成 Query String
            </button>
          </div>
        )}
      </div>

      {/* Output Panel */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Eye" size={16} />
              </span>
              编解码输出结果
            </span>
            {outputText && (
              <button
                onClick={handleCopy}
                className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-all cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={12} className="inline mr-1" />
                {isCopied ? '已复制' : '复制结果'}
              </button>
            )}
          </div>

          <div className="flex-1 p-5 flex flex-col">
            <textarea
              readOnly
              value={outputText}
              placeholder="计算后的 URL 字符串、Query 参数 JSON 对象、或转义结果将实时呈现在这里..."
              className="w-full flex-1 min-h-[250px] text-xs font-mono bg-slate-50 border border-slate-100 p-3 rounded-lg outline-hidden resize-none text-slate-800 leading-normal"
            />
          </div>
        </div>

        {/* Utility tip */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
          <p className="font-bold text-slate-700 mb-1">💡 开发场景说明：</p>
          • <strong>URL 编码</strong> 遵循 RFC 3986 标准，可以将中文字符、特殊符号（如空格转为 `%20`，或 `&` 等符号）进行多字节 16 进制安全转义，防止链接传参截断和乱码。<br />
          • <strong>一键提取参数</strong> 可以完美将复杂 URL 拆解为标准的 Key-Value 数据，方便阅读和直接调试修改，重新拼装只需一秒。
        </div>
      </div>
    </div>
  );
};
