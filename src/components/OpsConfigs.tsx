import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ToolComponentProps } from '../types';

export const OpsConfigs: React.FC<ToolComponentProps> = ({ onRecordUsage }) => {
  const [activeTab, setActiveTab] = useState<'nginx' | 'docker'>('nginx');

  // Nginx state
  const [nginxTemplate, setNginxTemplate] = useState<'proxy' | 'spa' | 'https'>('proxy');
  const [domain, setDomain] = useState<string>('example.com');
  const [proxyPort, setProxyPort] = useState<number>(3000);
  const [staticPath, setStaticPath] = useState<string>('/var/www/dist');
  const [enableGzip, setEnableGzip] = useState<boolean>(true);
  const [maxBodySize, setMaxBodySize] = useState<string>('16M');
  const [securityHeaders, setSecurityHeaders] = useState<boolean>(true);
  const [clientBodyBufferSize, setClientBodyBufferSize] = useState<string>('128k');
  const [proxyBufferSize, setProxyBufferSize] = useState<string>('128k');
  const [proxyHttpVersion, setProxyHttpVersion] = useState<string>('1.1');
  const [proxyPassTrailingSlash, setProxyPassTrailingSlash] = useState<boolean>(false);

  // Docker state
  const [dockerTemplate, setDockerTemplate] = useState<'postgres' | 'redis' | 'fullstack'>('postgres');
  const [dbName, setDbName] = useState<string>('app_db');
  const [dbUser, setDbUser] = useState<string>('postgres');
  const [dbPassword, setDbPassword] = useState<string>('super_secret_123');
  const [hostPort, setHostPort] = useState<number>(5432);
  const [restartPolicy, setRestartPolicy] = useState<string>('always');
  const [limitLogging, setLimitLogging] = useState<boolean>(true);

  // General state
  const [outputCode, setOutputCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Generate output when any state changes
  useEffect(() => {
    let code = '';
    if (activeTab === 'nginx') {
      const gzipBlock = enableGzip ? `
    # Gzip 静态资源高级压缩已开启
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;` : '';

      const securityBlock = securityHeaders ? `
    # 安全加固响应头配置已开启
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self';" always;` : '';

      const maxBodyLine = maxBodySize ? `client_max_body_size ${maxBodySize};` : '# client_max_body_size (未设置)';
      const clientBodyBufferLine = clientBodyBufferSize ? `client_body_buffer_size ${clientBodyBufferSize};` : '# client_body_buffer_size (未设置)';
      const proxyBufferLine = proxyBufferSize ? `proxy_buffer_size ${proxyBufferSize};` : '# proxy_buffer_size (未设置)';

      const commonSettings = `
    # 全局客户端连接限制与内存缓冲区大小
    ${maxBodyLine}
    ${clientBodyBufferLine}
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off; # 隐藏 Nginx 版本号，杜绝版本漏洞泄露
${gzipBlock}${securityBlock}`;

      const passSlash = proxyPassTrailingSlash ? '/' : '';

      if (nginxTemplate === 'proxy') {
        code = `server {
    listen 80;
    server_name ${domain};
${commonSettings}

    # 主站反向代理转发
    location / {
        proxy_pass http://127.0.0.1:${proxyPort}${passSlash};
        ${proxyHttpVersion ? `proxy_http_version ${proxyHttpVersion};` : '# proxy_http_version (未设置，使用 Nginx 默认 1.0)'}${proxyHttpVersion === '1.1' ? `
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';` : ''}
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        ${proxyBufferLine}
        
        # 代理连接超时加固
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}`;
      } else if (nginxTemplate === 'spa') {
        code = `server {
    listen 80;
    server_name ${domain};
${commonSettings}

    root ${staticPath};
    index index.html;

    # 单页面应用前端路由静态转发
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态图片/多媒体缓存优化 (1M)
    location ~* \\.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {
        expires 1M;
        access_log off;
        add_header Cache-Control "public, no-transform";
    }

    # CSS 和 JavaScript 缓存优化 (1年)
    location ~* \\.(?:css|js)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, no-transform";
    }
}`;
      } else if (nginxTemplate === 'https') {
        code = `server {
    listen 80;
    server_name ${domain} www.${domain};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain} www.${domain};
${commonSettings}

    # SSL 证书及安全套件配置 (推荐 A+ 级别)
    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';

    # 反向代理后端
    location / {
        proxy_pass http://127.0.0.1:${proxyPort}${passSlash};
        ${proxyHttpVersion ? `proxy_http_version ${proxyHttpVersion};` : '# proxy_http_version (未设置，使用 Nginx 默认 1.0)'}${proxyHttpVersion === '1.1' ? `
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';` : ''}
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        ${proxyBufferLine}
    }
}`;
      }
    } else {
      const loggingBlock = limitLogging ? `
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"` : '';

      if (dockerTemplate === 'postgres') {
        code = `version: '3.8'

services:
  database:
    image: postgres:15-alpine
    container_name: postgres_${dbName}
    restart: ${restartPolicy}
    environment:
      POSTGRES_DB: ${dbName}
      POSTGRES_USER: ${dbUser}
      POSTGRES_PASSWORD: ${dbPassword}
    ports:
      - "${hostPort}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data${loggingBlock}

volumes:
  postgres_data:
    driver: local`;
      } else if (dockerTemplate === 'redis') {
        code = `version: '3.8'

services:
  cache:
    image: redis:7.0-alpine
    container_name: redis_cache
    restart: ${restartPolicy}
    command: redis-server --save 20 1 --loglevel warning --requirepass ${dbPassword}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data${loggingBlock}

volumes:
  redis_data:
    driver: local`;
      } else if (dockerTemplate === 'fullstack') {
        code = `version: '3.8'

services:
  web:
    image: nginx:alpine
    container_name: frontend_nginx
    restart: ${restartPolicy}
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./dist:/var/www/html:ro
    depends_on:
      - api${loggingBlock}

  api:
    image: node:18-alpine
    container_name: backend_api
    restart: ${restartPolicy}
    working_dir: /app
    volumes:
      - .:/app
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${dbUser}:${dbPassword}@db:5432/${dbName}
    command: npm run start
    depends_on:
      - db${loggingBlock}

  db:
    image: postgres:15-alpine
    container_name: postgres_db
    restart: ${restartPolicy}
    environment:
      POSTGRES_DB: ${dbName}
      POSTGRES_USER: ${dbUser}
      POSTGRES_PASSWORD: ${dbPassword}
    volumes:
      - db_data:/var/lib/postgresql/data${loggingBlock}

volumes:
  db_data:`;
      }
    }
    setOutputCode(code);
  }, [
    activeTab,
    nginxTemplate,
    domain,
    proxyPort,
    staticPath,
    enableGzip,
    maxBodySize,
    securityHeaders,
    dockerTemplate,
    dbName,
    dbUser,
    dbPassword,
    hostPort,
    restartPolicy,
    limitLogging,
    clientBodyBufferSize,
    proxyBufferSize,
    proxyHttpVersion,
    proxyPassTrailingSlash
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(outputCode).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onRecordUsage();
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* Settings Side (Left) */}
      <div className="md:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-5">
        <div className="flex border border-slate-200 bg-slate-100 p-1 rounded-md gap-1">
          <button
            onClick={() => setActiveTab('nginx')}
            className={`flex-1 text-center text-xs font-bold py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'nginx'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Nginx 转发配置
          </button>
          <button
            onClick={() => setActiveTab('docker')}
            className={`flex-1 text-center text-xs font-bold py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === 'docker'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Docker Compose
          </button>
        </div>

        {activeTab === 'nginx' ? (
          // Nginx settings
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">配置目标模板</label>
              <select
                value={nginxTemplate}
                onChange={(e) => setNginxTemplate(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
              >
                <option value="proxy">反向代理 (Reverse Proxy)</option>
                <option value="spa">静态网站 SPA 转发路由</option>
                <option value="https">HTTPS 与 SSL 高安全转发</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">域名 (Server Name)</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value.replace(/[^a-zA-Z0-9.\-]/g, ''))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
              />
            </div>

            {nginxTemplate !== 'spa' ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">后端代理端口</label>
                  <input
                    type="number"
                    value={proxyPort}
                    onChange={(e) => setProxyPort(parseInt(e.target.value) || 3000)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      HTTP 协议版本
                    </label>
                    <select
                      value={proxyHttpVersion}
                      onChange={(e) => setProxyHttpVersion(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                    >
                      <option value="1.1">HTTP/1.1 (推荐，支持 Keep-Alive)</option>
                      <option value="1.0">HTTP/1.0 (经典兼容)</option>
                      <option value="">(留空) 不设置 (使用默认 1.0)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      proxy_pass 尾部斜杠
                    </label>
                    <select
                      value={proxyPassTrailingSlash ? 'yes' : 'no'}
                      onChange={(e) => setProxyPassTrailingSlash(e.target.value === 'yes')}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                    >
                      <option value="no">不带 / (完整透传请求路径)</option>
                      <option value="yes">带 / (剥离并替换前缀)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">静态资源宿主根目录 (Root)</label>
                <input
                  type="text"
                  value={staticPath}
                  onChange={(e) => setStaticPath(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                />
              </div>
            )}

            {/* Additional granular options requested by user */}
            <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-900 block">内存缓冲与上传限制</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    请求体内存缓存
                  </label>
                  <select
                    value={clientBodyBufferSize}
                    onChange={(e) => setClientBodyBufferSize(e.target.value)}
                    className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                  >
                    <option value="64k">64k (轻量级 API)</option>
                    <option value="128k">128k (标准推荐)</option>
                    <option value="256k">256k (大型 JSON 接口)</option>
                    <option value="512k">512k</option>
                    <option value="">(留空) 不设置 (使用系统默认)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    代理缓冲区大小
                  </label>
                  <select
                    value={proxyBufferSize}
                    onChange={(e) => setProxyBufferSize(e.target.value)}
                    className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                  >
                    <option value="32k">32k</option>
                    <option value="64k">64k</option>
                    <option value="128k">128k (标准推荐)</option>
                    <option value="256k">256k</option>
                    <option value="">(留空) 不设置 (使用系统默认)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 font-sans">
                  最大允许上传限制 (client_max_body_size)
                </label>
                <select
                  value={maxBodySize}
                  onChange={(e) => setMaxBodySize(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-3 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                >
                  <option value="2M">2M (轻量限制)</option>
                  <option value="16M">16M (标准后台)</option>
                  <option value="100M">100M (宽裕大图支持)</option>
                  <option value="500M">500M (大文件多媒体)</option>
                  <option value="">(留空) 不限制 (省略该指令)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-600 font-medium">启用 Gzip 静态压缩</span>
                <input
                  type="checkbox"
                  checked={enableGzip}
                  onChange={(e) => setEnableGzip(e.target.checked)}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-4 w-4 cursor-pointer accent-slate-900"
                />
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-600 font-medium">启用安全响应头部防护</span>
                <input
                  type="checkbox"
                  checked={securityHeaders}
                  onChange={(e) => setSecurityHeaders(e.target.checked)}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-4 w-4 cursor-pointer accent-slate-900"
                />
              </div>

              {nginxTemplate !== 'spa' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-500 flex flex-col gap-1.5 leading-relaxed mt-2">
                  <span className="font-bold text-slate-700">💡 关键细节说明：</span>
                  <p>
                    • <strong>默认为空代表不设置</strong>：当上传大小限制、请求体大小或缓冲区大小留空时，生成文件会省略对应指令，代表使用默认环境设置。
                  </p>
                  <p>
                    • <strong>proxy_pass 尾部斜杠效果</strong>：
                    <br />
                    - <code>proxy_pass http://ip:port;</code> (不带斜杠) ➔ <strong>完整透传路径</strong>。如 location /api，访问 /api/user ➔ 后端收到 /api/user。
                    <br />
                    - <code>proxy_pass http://ip:port/;</code> (带斜杠) ➔ <strong>路径重写</strong>。如 location /api，访问 /api/user ➔ 匹配的 /api 被剥离，后端收到 /user。
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Docker settings
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Compose 服务模型</label>
              <select
                value={dockerTemplate}
                onChange={(e) => setDockerTemplate(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
              >
                <option value="postgres">PostgreSQL 独立数据库</option>
                <option value="redis">Redis 独立缓存</option>
                <option value="fullstack">前后端分离 + 数据库 (全栈)</option>
              </select>
            </div>

            {dockerTemplate !== 'redis' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">数据库名称</label>
                  <input
                    type="text"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">数据库账号名</label>
                  <input
                    type="text"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">访问密码 (Password)</label>
              <input
                type="text"
                value={dbPassword}
                onChange={(e) => setDbPassword(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
              />
            </div>

            {dockerTemplate === 'postgres' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">宿主机映射物理端口</label>
                <input
                  type="number"
                  value={hostPort}
                  onChange={(e) => setHostPort(parseInt(e.target.value) || 5432)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 font-mono text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                />
              </div>
            )}

            {/* Expanded granular options for Docker */}
            <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-900 block">高级运行与容灾配置</span>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">容器故障重启策略</label>
                <select
                  value={restartPolicy}
                  onChange={(e) => setRestartPolicy(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-3 text-slate-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-black"
                >
                  <option value="always">always (总是自动重启)</option>
                  <option value="unless-stopped">unless-stopped (除非手动停止)</option>
                  <option value="on-failure">on-failure (仅在非正常退出时重启)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-600 font-medium">自动限制容器日志文件大小</span>
                <input
                  type="checkbox"
                  checked={limitLogging}
                  onChange={(e) => setLimitLogging(e.target.checked)}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-4 w-4 cursor-pointer accent-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-500 font-semibold mt-2 bg-slate-50 p-2.5 rounded-md border border-slate-200">
          <strong>生产环境安全建议：</strong> 所有的转发和配置代码在本地高隔离沙箱中生成。切勿将实际业务的明文密码提交给第三方。本系统确保数据计算在浏览器内存中运行，绝对合规、绝对安全。
        </div>
      </div>

      {/* Code Viewer Side (Right) */}
      <div className="md:col-span-7 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                <Icon name="Server" size={16} />
              </span>
              <span className="font-semibold text-slate-900 text-sm">生成的 Nginx/Docker 配置文件内容</span>
            </div>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 font-semibold text-xs py-1.5 px-3 rounded-md border transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              <Icon name={isCopied ? 'Check' : 'Copy'} size={12} />
              {isCopied ? '已复制配置文件' : '复制代码内容'}
            </button>
          </div>

          <div className="p-5">
            <textarea
              value={outputCode}
              readOnly
              className="w-full h-[480px] font-mono text-xs bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 outline-hidden resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

    </div>
  );
};
