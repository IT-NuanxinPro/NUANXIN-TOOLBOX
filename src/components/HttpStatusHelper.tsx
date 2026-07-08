import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface HttpStatusInfo {
  code: number;
  phrase: string;
  chinese: string;
  category: '1xx' | '2xx' | '3xx' | '4xx' | '5xx';
  description: string;
  scenarios: string;
  solution: string;
}

const HTTP_STATUS_DB: HttpStatusInfo[] = [
  {
    code: 200,
    phrase: 'OK',
    chinese: '成功',
    category: '2xx',
    description: '请求成功。表示服务器已成功处理请求并返回所请求的数据。',
    scenarios: '网页正常加载、REST API 正常返回 JSON 数据。',
    solution: '最健康的运行状态。在后端开发中，对于 GET/POST 操作，默认返回 200 OK 配合具体业务数据体。'
  },
  {
    code: 201,
    phrase: 'Created',
    chinese: '已创建',
    category: '2xx',
    description: '请求成功且服务器创建了新的资源。通常是在 POST/PUT 成功创建数据行后返回。',
    scenarios: '用户注册成功、创建新的数据库条目、上传文件成功。',
    solution: '在 RESTful API 规范中，推荐用于新建资源接口。通常应在 Response Header 中包含新资源的 Location URL。'
  },
  {
    code: 204,
    phrase: 'No Content',
    chinese: '无内容',
    category: '2xx',
    description: '服务器成功处理了请求，但不需要返回任何内容体（ResponseBody）。',
    scenarios: '删除某个资源成功（DELETE），或者发送打点/日志上报数据后，不占用响应带宽。',
    solution: '对于不需要回传内容的 API（如 DELETE 成功），返回 204 比 200 更加契合标准语义，能节省多余数据传输。'
  },
  {
    code: 206,
    phrase: 'Partial Content',
    chinese: '部分内容',
    category: '2xx',
    description: '服务器已经成功处理了部分 GET 请求。常用于客户端进行断点续传或分段下载大文件。',
    scenarios: '在线视频/音频进度条任意拖动播放，大文件（如安装包）多线程下载。',
    solution: '服务端需要支持 Range 请求头，并响应 Content-Range 字段。例如 Nginx 默认支持此状态，无需额外配置。'
  },
  {
    code: 301,
    phrase: 'Moved Permanently',
    chinese: '永久重定向',
    category: '3xx',
    description: '所请求的页面已永久转移至新的 URL。搜索引擎在抓取时会自动将权重、索引及历史排名更新至新目标。',
    scenarios: '全站整改域名更换、或者从 http:// 强制永久重定向升级至 https://。',
    solution: '在 Nginx 中配置：\nrewrite ^(.*)$ https://$host$1 permanent;\n或者\nreturn 301 https://$host$request_uri;'
  },
  {
    code: 302,
    phrase: 'Found',
    chinese: '临时重定向',
    category: '3xx',
    description: '所请求的页面临时转移到了新的位置。搜索引擎在后续索引中依然会保留原有的 URL 地址。',
    scenarios: '用户登录鉴权拦截（未登录时临时跳转到 /login）、促销活动临时导流。',
    solution: '在 Nginx 中配置 rewrite 或 return 302 /login;。在 Express 中调用 res.redirect("/login") 即默认为 302 重定向。'
  },
  {
    code: 304,
    phrase: 'Not Modified',
    chinese: '资源未修改',
    category: '3xx',
    description: '协商缓存生效。表示自上次请求以来，服务器上的资源未发生任何改变，客户端应直接使用本地浏览器缓存。',
    scenarios: '再次访问静态 CSS/JS 文件、图片等。客户端发送了 If-None-Match (Etag) 或 If-Modified-Since 请求头。',
    solution: '极大地节省了服务器网络出站带宽。在 Nginx 中，默认会对静态文件开启缓存控制（通过 ETag 和 Last-Modified 头）。可以通过配置 expires 进一步强制强缓存。'
  },
  {
    code: 400,
    phrase: 'Bad Request',
    chinese: '客户端请求错误',
    category: '4xx',
    description: '服务器无法理解或解析该请求，这通常是由于客户端发送的请求语法有误、数据格式不匹配或参数缺失。',
    scenarios: '前端传的 JSON 字符串格式破损（漏了逗号）、或者后端验证框架（如 Joi/Zod）发现必填参数未提供。',
    solution: '1. 排查前端发包的 Body 数据和 Header Content-Type。\n2. 检查后端报错日志，明确验证规则（Schema validation）哪一项不满足要求。'
  },
  {
    code: 401,
    phrase: 'Unauthorized',
    chinese: '未授权 / 身份凭证丢失',
    category: '4xx',
    description: '当前请求需要用户进行身份认证，或者提供的 Authorization Token/Cookie 已过期失效。',
    scenarios: '访问受保护路由（如个人中心）时，Token 丢失、JWT 解密失败、Cookie 已过期。',
    solution: '1. 客户端需在请求头中附带 Bearer Token。\n2. 接口检测到 401 时，前端 Axios 拦截器应自动清理失效 Token 并重定向至登录页。'
  },
  {
    code: 403,
    phrase: 'Forbidden',
    chinese: '拒绝访问 / 权限不足',
    category: '4xx',
    description: '服务器理解请求但拒绝执行。通常是因为用户虽已登录，但其角色不具备访问该接口的权限；或者由于 IP 黑白名单、防盗链拦截。',
    scenarios: '普通用户尝试访问 /admin 敏感后台、或者在 Nginx 中由于文件夹没有读写执行权直接报错 403 Forbidden。',
    solution: '1. 检查物理目录的 Linux 权限（如 chown -R www-data:www-data /var/www/html）。\n2. 检查 Nginx 配置文件中是否有 deny all、或者 IP 限制、Referer 防盗链规则。'
  },
  {
    code: 404,
    phrase: 'Not Found',
    chinese: '页面或接口未找到',
    category: '4xx',
    description: '服务器找不到请求的物理文件或对应的 API 路由路径。',
    scenarios: '前端请求了不存在的接口地址（如 /api/v2/foo）、或者在 Nginx SPA 应用中刷新页面时返回 404（因为服务器没找到该物理路径）。',
    solution: '1. 核对 API 拼写和请求方法（GET/POST）。\n2. 对于 React/Vue 等单页应用，在 Nginx 中须配置 try_files $uri $uri/ /index.html; 避免刷新出现 404。'
  },
  {
    code: 405,
    phrase: 'Method Not Allowed',
    chinese: '请求方法不允许',
    category: '4xx',
    description: '请求行中指定的请求方法（GET/POST/PUT/DELETE）不允许被用于请求对应的接口。',
    scenarios: '一个接口只支持 POST 提交表单，但前端错用 GET 方式去请求。',
    solution: '检查 Axios 的 method 字段，核对服务端路由注册（例如 Express 中 app.post("/api") 还是 app.get("/api")）。'
  },
  {
    code: 413,
    phrase: 'Payload Too Large',
    chinese: '上传文件体积过大',
    category: '4xx',
    description: '客户端发送的请求体超出了服务器愿意或能够处理的最大体积上限。',
    scenarios: '前端尝试上传 50MB 巨型视频，但服务器仅限制最大 2MB 限制。',
    solution: '修改 Nginx 配置文件在 http 或 server 块中加入：client_max_body_size 100M; 并重启/重载 Nginx：systemctl reload nginx。同时确认后端服务也同步放大容量。'
  },
  {
    code: 429,
    phrase: 'Too Many Requests',
    chinese: '请求过于频繁 / 限流',
    category: '4xx',
    description: '客户端在给定的时间段内发送了太多的请求。触发了服务器防爬虫、API速率限制（Rate Limiting）机制。',
    scenarios: '高频恶意刷短信验证码、DDoS 攻击、高频爬虫抓取。',
    solution: '1. 前端实现节流/防抖，增加按钮 loading 态防止重复点击。\n2. Nginx 可使用 limit_req_zone 和 limit_conn_zone 模块来实现细粒度的并发和速率控制。'
  },
  {
    code: 500,
    phrase: 'Internal Server Error',
    chinese: '服务器内部错误',
    category: '5xx',
    description: '通用的服务器端报错提示。表示后端服务在处理该请求时发生未捕获异常、程序崩溃、或数据库死锁等问题。',
    scenarios: 'Node.js 内部抛出 ReferenceError/TypeError 未 catch 挂掉、数据库 SQL 语法报错导致服务闪退。',
    solution: '排查黄金法则：一定要查看后端物理服务器控制台日志。如果在 PM2 下，运行 pm2 logs 查看异常堆栈（Error Stack Trace）。'
  },
  {
    code: 502,
    phrase: 'Bad Gateway',
    chinese: '网关错误 / 后端无响应',
    category: '5xx',
    description: '作为网关或代理（如 Nginx）的服务器，从上游服务器（如 Node.js/PM2/PHP-FPM/Go）接收到了无效、无响应或格式破损的响应。',
    scenarios: 'Nginx 服务在跑，但代理的 Node.js 进程因为内存溢出、死锁或者未启动而彻底关停，导致 Nginx 连不上后端应用。',
    solution: '1. 排查后端应用状态：pm2 list 检查 Node 服务是否在 active，或 systemctl status nodeapp。\n2. 检查 Nginx 转发端口是否和 Node 真实监听端口完全对齐。'
  },
  {
    code: 503,
    phrase: 'Service Unavailable',
    chinese: '服务当前不可用',
    category: '5xx',
    description: '服务器由于临时的超载或正在进行维护，导致目前无法处理任何 HTTP 请求。',
    scenarios: '高并发秒杀活动导致服务器物理 CPU/内存爆满挂起、或者是运维人员临时停机更新系统版本。',
    solution: '1. 配置限流排队机制，削峰填谷。\n2. Nginx 可优雅设置备用服务器（upstream backup）或者直接重定向至一个友好的静态 HTML 静态排队提示页。'
  },
  {
    code: 504,
    phrase: 'Gateway Timeout',
    chinese: '网关超时',
    category: '5xx',
    description: '作为代理服务器的 Nginx 无法在预设的时限内，从上游应用服务器收到及时的完整响应。',
    scenarios: '用户请求了一个导出100万行 Excel 的超慢接口，Node 慢吞吞处理了 2 分钟，但 Nginx 默认 60 秒就强行中断了和 Node 的连接，报 504。',
    solution: '1. 优化慢 SQL 或大文件导出，改用异步架构。\n2. 延长 Nginx 的超时限制配置：\nproxy_read_timeout 300s;\nproxy_send_timeout 300s;\nkeepalive_timeout 300s;'
  }
];

interface HttpStatusHelperProps {
  onRecordUsage?: () => void;
}

export const HttpStatusHelper: React.FC<HttpStatusHelperProps> = ({ onRecordUsage }) => {
  const [httpSearch, setHttpSearch] = useState<string>('');
  const [httpCategory, setHttpCategory] = useState<string>('all');
  const [selectedHttpCode, setSelectedHttpCode] = useState<number | null>(200);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRecord = () => {
    if (onRecordUsage) onRecordUsage();
  };

  return (
    <div id="http-status-helper-root" className="flex flex-col gap-6 max-w-7xl mx-auto p-1 animate-fade-in">
      
      {/* Controls Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Icon name="Search" size={16} />
            </div>
            <input
              type="text"
              value={httpSearch}
              onChange={(e) => { setHttpSearch(e.target.value); handleRecord(); }}
              placeholder="搜索状态码或中文说明... (例如：502, Bad Gateway, 超时, 缓存)"
              className="w-full text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg py-2.5 pl-10 pr-10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
            />
            {httpSearch && (
              <button
                onClick={() => setHttpSearch('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon name="X" size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">按区间筛选：</span>
          {[
            { id: 'all', label: '全部状态码' },
            { id: '2xx', label: '2xx 成功 (Success)' },
            { id: '3xx', label: '3xx 重定向 (Redirection)' },
            { id: '4xx', label: '4xx 客户端错误 (Client Error)' },
            { id: '5xx', label: '5xx 服务端错误 (Server Error)' }
          ].map((cat) => {
            const isActive = httpCategory === cat.id;
            const count = cat.id === 'all' 
              ? HTTP_STATUS_DB.length 
              : HTTP_STATUS_DB.filter(c => c.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => { setHttpCategory(cat.id); setSelectedHttpCode(null); handleRecord(); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1.5 ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid with List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Status Code Cards Grid - 7 cols */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {HTTP_STATUS_DB.filter(item => {
              const matchesCategory = httpCategory === 'all' || item.category === httpCategory;
              const queryLower = httpSearch.toLowerCase().trim();
              const matchesSearch = !queryLower ||
                item.code.toString().includes(queryLower) ||
                item.phrase.toLowerCase().includes(queryLower) ||
                item.chinese.toLowerCase().includes(queryLower) ||
                item.description.toLowerCase().includes(queryLower);
              return matchesCategory && matchesSearch;
            }).map((item) => {
              const isSelected = selectedHttpCode === item.code;
              let badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
              if (item.category === '2xx') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              if (item.category === '3xx') badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
              if (item.category === '4xx') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
              if (item.category === '5xx') badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';

              return (
                <button
                  key={item.code}
                  onClick={() => { setSelectedHttpCode(item.code); handleRecord(); }}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 bg-white ${
                    isSelected 
                      ? 'ring-2 ring-slate-900 border-transparent shadow-sm' 
                      : 'border-slate-200 hover:border-slate-350 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg font-mono font-bold text-slate-900">{item.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                      {item.phrase}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{item.chinese}</h5>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Status Code Detail Inspector Panel - 5 cols */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4 lg:sticky lg:top-4">
          {selectedHttpCode ? (() => {
            const item = HTTP_STATUS_DB.find(c => c.code === selectedHttpCode)!;
            let cardColor = 'border-slate-100 bg-slate-50/50';
            if (item.category === '2xx') cardColor = 'border-emerald-100 bg-emerald-50/10';
            if (item.category === '3xx') cardColor = 'border-blue-100 bg-blue-50/10';
            if (item.category === '4xx') cardColor = 'border-amber-100 bg-amber-50/10';
            if (item.category === '5xx') cardColor = 'border-rose-100 bg-rose-50/10';

            return (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className={`p-4 rounded-xl border ${cardColor} flex flex-col gap-1`}>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-mono font-black text-slate-900">{item.code}</span>
                    <span className="text-sm font-bold text-slate-500 font-mono">{item.phrase}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{item.chinese}</h4>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">协议标准释义：</span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.description}</p>
                </div>

                <div className="h-[1px] bg-slate-100 my-1" />

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">常见业务应用场景：</span>
                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-xs text-slate-700 font-medium leading-relaxed">
                    {item.scenarios}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">运维与后端优化方案：</span>
                    <button
                      onClick={() => handleCopy(item.solution)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name={copiedText === item.solution ? 'Check' : 'Copy'} size={10} />
                      {copiedText === item.solution ? '已复制' : '复制方案'}
                    </button>
                  </div>
                  <div className="bg-slate-900 text-slate-200 font-mono rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap">
                    {item.solution}
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="p-3.5 bg-slate-50 text-slate-350 rounded-full">
                <Icon name="Globe" size={28} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">未选中任何 HTTP 状态码</p>
                <p className="text-[11px] text-slate-400 mt-1">在左侧列表中点击任意状态码卡片，即可在此实时查看深度的 RFC 参数剖析与 Nginx/后端 错误优化解决方案。</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
