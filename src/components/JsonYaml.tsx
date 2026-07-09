import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { SendToToolButton } from './SendToToolButton';
import { useToolBridge } from '../hooks/useToolBridge';
import { ToolComponentProps } from '../types';

const DEMO_JSON = `{
  "appName": "Local Toolbox",
  "version": "1.0.0",
  "status": "online",
  "features": [
    "local-first",
    "secure-sandbox",
    "zero-server-uploads"
  ],
  "configuration": {
    "theme": "slate-light",
    "maxFileSizeMb": 10,
    "allowedExtensions": [".svg", ".json", ".yaml"]
  }
}`;

export const JsonYaml: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [inputText, setInputText] = useState<string>(DEMO_JSON);
  const [indentSize, setIndentSize] = useState<string>('2');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const { pendingTransfer, consumeTransfer } = useToolBridge();

  // 接收来自其他工具的数据
  useEffect(() => {
    if (pendingTransfer) {
      setInputText(pendingTransfer.data);
      consumeTransfer();
    }
  }, [pendingTransfer, consumeTransfer]);

  // Very lightweight line-based JSON to YAML converter
  const jsonToYaml = (jsonObj: any, indent = 0): string => {
    let yamlStr = '';
    const spacing = ' '.repeat(indent);

    if (Array.isArray(jsonObj)) {
      if (jsonObj.length === 0) return ' []\n';
      yamlStr += '\n';
      jsonObj.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          const subYaml = jsonToYaml(item, indent + 2);
          yamlStr += `${spacing}- ${subYaml.trimStart()}`;
        } else {
          yamlStr += `${spacing}- ${item}\n`;
        }
      });
    } else if (typeof jsonObj === 'object' && jsonObj !== null) {
      const keys = Object.keys(jsonObj);
      if (keys.length === 0) return ' {}\n';
      if (indent > 0) yamlStr += '\n';
      keys.forEach((key) => {
        const val = jsonObj[key];
        if (typeof val === 'object' && val !== null) {
          yamlStr += `${spacing}${key}:${jsonToYaml(val, indent + 2)}`;
        } else {
          const scalarVal = typeof val === 'string' ? `"${val}"` : val;
          yamlStr += `${spacing}${key}: ${scalarVal}\n`;
        }
      });
    } else {
      yamlStr += ` ${jsonObj}\n`;
    }
    return yamlStr;
  };

  // Lightweight line-based YAML to JSON converter for simple flat files
  const yamlToJson = (yaml: string): string => {
    const lines = yaml.split('\n');
    const result: any = {};
    let currentKey = '';

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        const key = parts[0].trim();
        let val: any = parts.slice(1).join(':').trim();

        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        } else if (!isNaN(Number(val)) && val !== '') {
          val = Number(val);
        }

        result[key] = val;
      }
    });

    return JSON.stringify(result, null, 2);
  };

  const handleFormatJSON = () => {
    try {
      if (!inputText.trim()) {
        setErrorMsg('请输入 JSON 文本');
        return;
      }
      const parsed = JSON.parse(inputText);
      const space = indentSize === 'tab' ? '\t' : parseInt(indentSize);
      setInputText(JSON.stringify(parsed, null, space));
      setErrorMsg(null);
      onRecordUsage();
    } catch (err: any) {
      setErrorMsg(`JSON 格式错误：${err.message}`);
    }
  };

  const handleMinifyJSON = () => {
    try {
      if (!inputText.trim()) {
        setErrorMsg('请输入 JSON 文本');
        return;
      }
      const parsed = JSON.parse(inputText);
      setInputText(JSON.stringify(parsed));
      setErrorMsg(null);
      onRecordUsage();
    } catch (err: any) {
      setErrorMsg(`JSON 格式压缩失败：${err.message}`);
    }
  };

  const handleToYaml = () => {
    try {
      if (!inputText.trim()) {
        setErrorMsg('请输入有效的 JSON 进行转换');
        return;
      }
      const parsed = JSON.parse(inputText);
      const yaml = jsonToYaml(parsed);
      setInputText(yaml.trim());
      setErrorMsg(null);
      onRecordUsage();
    } catch (err: any) {
      setErrorMsg(`无法转换：请输入合法的 JSON 结构。错误：${err.message}`);
    }
  };

  const handleToJSON = () => {
    try {
      if (!inputText.trim()) {
        setErrorMsg('请输入 YAML 文本');
        return;
      }
      const jsonStr = yamlToJson(inputText);
      setInputText(jsonStr);
      setErrorMsg(null);
      onRecordUsage();
    } catch (err: any) {
      setErrorMsg(`YAML 转换 JSON 失败：${err.message}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inputText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onRecordUsage();
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Configuration & Controls */}
      <div className="md:col-span-3 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4">
          <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Icon name="Sliders" className="text-slate-900" size={16} />
            格式化选项
          </h4>

          {/* Indent style selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">JSON 缩进大小</label>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 focus:outline-hidden focus:ring-1 focus:ring-black font-semibold text-slate-700"
            >
              <option value="2">2 空格 (推荐)</option>
              <option value="4">4 空格</option>
              <option value="tab">Tab 缩进</option>
            </select>
          </div>

          {/* Format triggers */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleFormatJSON}
              className="w-full cursor-pointer bg-slate-900 hover:bg-slate-950 text-white text-xs font-semibold py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Icon name="FileCode" size={14} />
              格式化 JSON
            </button>
            <button
              onClick={handleMinifyJSON}
              className="w-full cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-1.5"
            >
              <Icon name="Maximize2" size={14} />
              压缩 JSON
            </button>
          </div>

          <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pt-2 pb-2.5">
            <Icon name="RefreshCw" className="text-slate-900" size={16} />
            语法双向转换
          </h4>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleToYaml}
              className="w-full cursor-pointer bg-slate-900 hover:bg-slate-850 text-white text-xs font-semibold py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-1.5"
            >
              JSON 转 YAML
              <Icon name="ArrowRight" size={12} />
            </button>
            <button
              onClick={handleToJSON}
              className="w-full cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-1.5"
            >
              YAML 转 JSON (简单键值)
            </button>
          </div>

          <div className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-md border border-slate-200 leading-relaxed">
            <strong>隐私小常识：</strong> 所有的语法格式化和配置转换均在浏览器内存中实时执行，不发生任何网络网络请求。
          </div>
        </div>
      </div>

      {/* Editor Space (Right) */}
      <div className="md:col-span-9 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="FileText" size={16} />
              </span>
              <span className="font-semibold text-slate-900 text-sm">编辑器</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputText(DEMO_JSON)}
                className="text-xs text-slate-800 hover:text-slate-950 font-bold px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                加载 JSON 模版
              </button>
              <button
                onClick={() => {
                  setInputText('');
                  setErrorMsg(null);
                }}
                className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                title="清空"
              >
                <Icon name="Trash2" size={14} />
              </button>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 font-semibold text-xs py-1.5 px-3 rounded-md border transition-all cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                }`}
              >
                <Icon name={isCopied ? 'Check' : 'Copy'} size={12} />
                {isCopied ? '已复制' : '复制内容'}
              </button>
              <SendToToolButton data={inputText} label="发送到" />
            </div>
          </div>

          {/* Text Area */}
          <div className="p-5">
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="请输入您想要格式化或转换的 JSON 或 YAML 文本..."
              className="w-full h-[400px] font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 outline-hidden focus:ring-2 focus:ring-black/20 focus:border-black resize-none leading-relaxed transition-all"
            />

            {errorMsg && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-md p-3 border border-red-100 flex items-start gap-2 animate-fadeIn">
                <Icon name="AlertTriangle" className="shrink-0 mt-0.5 text-red-500" size={14} />
                <div>
                  <span className="font-semibold">校验未通过：</span>
                  {errorMsg}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
