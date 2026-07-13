<div align="center">

# 🧰 暖心工具箱

**粘贴即处理的开发工作台 · AI 辅助 · 本地优先 · 数据不落地**

</div>

一个安全、好用、温暖贴心的开发者百宝箱。所有加密解密、转换解析、网络计算均在浏览器本地沙盒中完成，数据绝不上传服务器，全方位守护您的代码与隐私安全。

## ✨ 特性

- 🔒 **100% 本地运算** —— 所有数据处理均在浏览器中完成，不上传任何敏感信息
- ⚡ **毫秒级响应** —— 基于 Vite + React 19 构建，启动快、交互流畅
- 🎨 **精致极简设计** —— Tailwind CSS 驱动的现代界面，专注工具本身
- 🪄 **粘贴即识别** —— 自动识别 JSON、JWT、URL、cURL、SVG、SQL、Cron 等内容并推荐工具
- 🤖 **暖心 AI 助手** —— 理解当前工具上下文，推荐下一步工具和开发工作流
- 🗂️ **任务化分类** —— 数据、API、前端、图片、安全、文本、运维七个意图分类
- 🔗 **工具间传递** —— 处理结果可继续发送到其他工具，减少重复复制和搜索
- ⭐ **个性化收藏** —— 支持收藏常用工具、记录使用频次与最近访问

## 🛠️ 内置工具（共 33 个）

| 分类 | 数量 | 代表工具 |
| --- | ---: | --- |
| 数据与格式 | 6 | JSON/YAML、SQL、JSON → TypeScript、时间戳、UUID、JSON Diff |
| API 与调试 | 5 | HTTP 请求、cURL 转换、JWT、URL 参数、User-Agent |
| 前端与 UI | 5 | 颜色、CSS 单位、CSS 渐变、HTML/Vue 代码场 |
| 图片与资源 | 4 | SVG 转换、二维码、Favicon、SVG 占位图 |
| 安全与编码 | 5 | Base64、哈希、RSA、AES、随机密码 |
| 文本与代码 | 3 | 正则、Markdown 文本处理、代码 Diff |
| 运维与网络 | 5 | Nginx/Docker、CIDR、Linux/Grep、Cron、HTTP 状态码 |

## 🚀 本地开发

**前置要求：** Node.js 20+、pnpm

```bash
# 安装依赖
pnpm install

# 启动开发服务器 (默认端口 3000)
pnpm dev

# 另开一个终端启动 AI 安全代理
pnpm dev:ai

# 类型检查
pnpm lint

# 生产构建 (产物输出至 dist/)
pnpm build

# 预览生产构建
pnpm preview
```

### 配置免费 AI

复制 `.env.example` 为 `.env.local`，填写 Groq 或其他兼容平台的密钥：

```env
AI_API_KEY="YOUR_GROQ_API_KEY"
AI_BASE_URL="https://api.groq.com/openai/v1"
AI_MODEL="qwen/qwen3-32b"
```

`.env.local` 已被 Git 忽略。密钥只能由 `server.ts` 读取；不要使用 `VITE_` 前缀保存任何密钥，因为 Vite 环境变量会进入浏览器构建产物。

## 📦 技术栈

- **框架**：React 19 + TypeScript
- **构建工具**：Vite 6
- **样式**：Tailwind CSS 4
- **动画**：Motion
- **图标**：lucide-react
- **包管理**：pnpm

## 🔐 隐私说明

本项目的确定性工具均为纯客户端实现：

- 加密、哈希、转换等敏感操作全部在浏览器本地沙盒完成
- 粘贴识别在浏览器本地完成，不会自动发送给 AI
- AI 只发送用户主动提交的对话和当前工具名称
- AI 密钥保存在服务端环境变量中，不进入浏览器构建产物

处理私钥、令牌等敏感数据时，建议只使用本地工具，不要粘贴到 AI 对话中。

## 📄 许可证

MIT
