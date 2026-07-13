export interface DetectedInput {
  type: string;
  description: string;
  toolIds: string[];
}

const looksLikeBase64 = (value: string) =>
  value.length >= 20 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);

export function detectToolInput(rawValue: string): DetectedInput | null {
  const value = rawValue.trim();
  if (!value) return null;

  if (/^<svg[\s>]/i.test(value)) {
    return {
      type: 'SVG 图片代码',
      description: '可以转换图片格式、调整尺寸或导出前端资源。',
      toolIds: ['svg-converter'],
    };
  }

  if (/^curl\s+/i.test(value)) {
    return {
      type: 'cURL 请求命令',
      description: '可以转换为前端请求代码，或继续进行接口调试。',
      toolIds: ['curl-converter', 'http-request-tester'],
    };
  }

  if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) {
    return {
      type: 'JWT Token',
      description: '可以在本地解析 Header、Payload 和过期时间。',
      toolIds: ['jwt-debugger', 'base64'],
    };
  }

  if (/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(value)) {
    return {
      type: 'IPv4 CIDR 网段',
      description: '可以计算子网掩码、广播地址和可用主机范围。',
      toolIds: ['subnet-calculator'],
    };
  }

  try {
    JSON.parse(value);
    return {
      type: 'JSON 数据',
      description: '可以格式化、结构对比，或生成 TypeScript 类型。',
      toolIds: ['json-yaml', 'json-to-ts', 'json-diff'],
    };
  } catch {
    // 不是 JSON，继续按其他格式识别。
  }

  if (/^https?:\/\/\S+$/i.test(value)) {
    return {
      type: 'URL 链接',
      description: '可以解析查询参数、进行编解码或生成二维码。',
      toolIds: ['url-codec', 'qrcode-gen', 'http-request-tester'],
    };
  }

  if (/^(select|insert|update|delete|create|alter|with)\b/i.test(value)) {
    return {
      type: 'SQL 语句',
      description: '可以自动格式化、压缩和转换关键字风格。',
      toolIds: ['sql-formatter'],
    };
  }

  if (/^[\d*/?,\-]+(?:\s+[\d*/?,\-]+){4}$/.test(value)) {
    return {
      type: 'Cron 表达式',
      description: '可以翻译执行规则，并预测后续运行时间。',
      toolIds: ['cron-parser'],
    };
  }

  if (looksLikeBase64(value)) {
    return {
      type: 'Base64 内容',
      description: '可以在浏览器本地解码和检查原始内容。',
      toolIds: ['base64'],
    };
  }

  return {
    type: '普通文本或代码',
    description: '可以清洗文本、测试正则或进行差异对比。',
    toolIds: ['text-editor', 'regex', 'code-diff'],
  };
}
