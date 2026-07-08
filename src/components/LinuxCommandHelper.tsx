import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface LinuxCommandHelperProps {
  onRecordUsage: () => void;
}

interface LinuxCommandInfo {
  command: string;
  title: string;
  category: 'file' | 'system' | 'network' | 'process' | 'archive' | 'permission';
  categoryLabel: string;
  description: string;
  explanation: string;
}

// Global static directory of common dev/ops commands with Chinese explanations
const LINUX_COMMANDS_DB: LinuxCommandInfo[] = [
  {
    command: 'ps -ef | grep nginx',
    title: '查看 Nginx 运行进程',
    category: 'process',
    categoryLabel: '进程与服务',
    description: '以完整全格式查看当前系统运行中的所有进程，并筛选过滤出与 Nginx 相关的服务状态、主进程及工作进程。',
    explanation: 'ps -ef 列出系统中的全部活跃进程，通过管道 | 将其传递给 grep 搜索 “nginx” 关键字。这是运维最常用于核实 Nginx 服务是否真的在后台运转的黄金命令。'
  },
  {
    command: 'ps aux | grep node | grep -v grep',
    title: '查找 Node 进程（排除 grep 自身）',
    category: 'process',
    categoryLabel: '进程与服务',
    description: '列出系统中所有正在运行的 Node.js 服务进程，同时剔除因为执行 grep 搜索自身而产生的多余行干扰。',
    explanation: 'grep -v grep 代表反向过滤，即筛选结果中不包含 “grep” 关键字的行，从而保证看到的是干净的真实进程列表。'
  },
  {
    command: 'top',
    title: '系统进程与硬件资源负载实时监视器',
    category: 'system',
    categoryLabel: '系统与硬件',
    description: '实时显示系统整体资源消耗。监控 CPU 负载、物理内存与虚拟内存使用、负载均值 Load Average，并动态倒序滚动当前最耗资源的活跃进程。',
    explanation: '在 top 界面中，按大写 [P] 可按 CPU 占用排序，按大写 [M] 按内存占用排序，按 [q] 退出监控。'
  },
  {
    command: 'htop',
    title: '彩色交互式进程管理终端（强烈推荐）',
    category: 'process',
    categoryLabel: '进程与服务',
    description: '比传统 top 更加现代、直观的彩色文本图形界面，支持鼠标点击、横向纵向滚动查看完整长指令、直接搜索或杀死进程。',
    explanation: '属于第三方增强工具，在 Ubuntu 下可通过 apt install htop 安装。支持按 F6 排序、F9 杀进程、F10 安全退出。'
  },
  {
    command: 'kill -9 <PID>',
    title: '强制杀死/终止指定 PID 的进程',
    category: 'process',
    categoryLabel: '进程与服务',
    description: '向指定的进程 ID (PID) 强制发送 SIGKILL (信号 9)，无视其当前是否处于阻塞、无响应或挂起状态，立刻终止其生命周期并回收内存。',
    explanation: '-9 代表 SIGKILL，强制瞬间杀灭，不给进程执行善后（写盘、存状态）的时间。日常排查若卡死极度好用。'
  },
  {
    command: 'pkill -f <process_name>',
    title: '根据名字模式批量杀死关联进程',
    category: 'process',
    categoryLabel: '进程与服务',
    description: '无需先执行 ps 寻找进程号，直接依据进程名称（或命令行包含的词）对目标进行批量匹配并强行杀死。',
    explanation: '-f 代表匹配完整命令行字符串。例如 pkill -f node 即可一次性切断所有 node 服务的连接。'
  },
  {
    command: 'systemctl restart nginx',
    title: '重启 Systemd 托管的 Nginx 服务',
    category: 'process',
    categoryLabel: '进程与服务',
    description: '在现代主流 Linux 操作系统（Ubuntu 16.04+ / CentOS 7+）中安全停止并重新初始化 Web 容器。',
    explanation: 'systemctl 是 Systemd 系统的中央管理工具。restart 会先安全 stop 再 start。如果只是更新配置，建议用 systemctl reload 进行平滑热载。'
  },
  {
    command: 'systemctl status nginx',
    title: '查询 Systemd 服务当前状态及异常日志',
    category: 'process',
    categoryLabel: '进程与服务',
    description: '显示指定后台服务的启动状态（Active/Inactive/Failed）、PID、主配置文件路径、CGroup 资源开销以及最末几行输出日志。',
    explanation: '排查服务 “为什么突然起不来” 的首选排障命令，通常能直接从最末端红字报错堆栈中发现语法错误。'
  },
  {
    command: 'systemctl enable nginx',
    title: '设置指定服务开机自启动',
    category: 'process',
    categoryLabel: '进程与服务',
    description: '将服务注册到系统各运行级别的软链接中，在服务器遭遇意外断电重启、重启维护后，确保 Web/API 业务自动恢复。',
    explanation: 'enable 代表启用自启，而 systemctl disable nginx 可以取消自启。'
  },

  // Network & Ports
  {
    command: 'lsof -i :80',
    title: '查询指定网络端口的被占用情况',
    category: 'network',
    categoryLabel: '网络与端口',
    description: '列出当前系统所有打开并占用了 80 端口的进程、用户、IP、协议类型以及具体 PID。',
    explanation: 'lsof (List Open Files) 的万能参数 -i :端口 可以用来揪出在起服务时报 “Address already in use” 的罪魁祸首进程。'
  },
  {
    command: 'netstat -tunlp',
    title: '查看系统当前所有监听状态的网络端口',
    category: 'network',
    categoryLabel: '网络与端口',
    description: '汇总展示所有的 TCP/UDP 监听端口、绑定地址（IPv4/IPv6）以及各自对应的关联应用进程 PID 与服务名称。',
    explanation: '-t (TCP), -u (UDP), -n (直接显示IP与端口数字), -l (仅显示监听状态的连接), -p (显示进程PID及程序名)。'
  },
  {
    command: 'ss -lntp',
    title: '高并发状态下极速查询 TCP 监听套接字',
    category: 'network',
    categoryLabel: '网络与端口',
    description: 'ss 工具是 netstat 的现代升级版，直接读取内核 Socket 数据，在数万个并发端口监听时比 netstat 运行效率快数倍。',
    explanation: '常用参数组合 -lntp 代表列出所有 TCP 连接的监听端，带有数字格式和 PID 信息，常驻运维工具包。'
  },
  {
    command: 'curl -I https://www.google.com',
    title: '获取目标网站 HTTP 响应头 / 证书检测',
    category: 'network',
    categoryLabel: '网络与端口',
    description: '向指定域名快速发起 HEAD 请求，仅返回 HTTP 响应头部（Status Code、Server、Content-Length 等），不下载正文。',
    explanation: '-I (--head) 特别适合用来在终端诊断网页重定向、HTTPS SSL 证书有效期或服务端缓存控制（Cache-Control）参数。'
  },
  {
    command: 'ping -c 4 baidu.com',
    title: '测试网络延迟、连通性并限制发包数',
    category: 'network',
    categoryLabel: '网络与端口',
    description: '向目标服务器发送 ICMP Echo 数据包测试 RTT 往返时延及丢包率。限制单次仅发送 4 次以防在终端无限循环刷屏。',
    explanation: '-c 4 代表 count=4。在 Linux 默认不加 -c 会一直无限 ping 运行，需要手动按 Ctrl + C。'
  },
  {
    command: 'curl ifconfig.me',
    title: '查询当前服务器出站的公网真实 IP',
    category: 'network',
    categoryLabel: '网络与端口',
    description: '向公网公共 IP 查询接口发起 HTTP 简单请求，即刻在终端显示出站流量被映射成哪一个公网 IP 地址。',
    explanation: '常用于确定多网卡出口流量、或者在云服务器安全组/白名单配置时精确获知本机当前的真实外网身份。'
  },

  // Files & Directories
  {
    command: 'find . -name "*.log" -mtime +7 -delete',
    title: '深度遍历并自动删除 7 天前的过期日志',
    category: 'file',
    categoryLabel: '文件与目录',
    description: '在当前文件夹目录树下检索所有以 .log 结尾、且文件最后修改时间在 7 天以前的文件，并直接强制静默删除。',
    explanation: '运维自动定时脚本的核心命令。-mtime +7 对应最后修改时间长于 7 天，-delete 对应直接物理擦除，切勿配错路径。'
  },
  {
    command: 'find /etc -name "nginx.conf"',
    title: '全盘或特定目录下检索指定文件名',
    category: 'file',
    categoryLabel: '文件与目录',
    description: '在 /etc 目录树中递归往下查找名为 nginx.conf 的具体文件，精确获取其文件所在的物理位置。',
    explanation: '支持模糊匹配通配符，例如 find /var/www -name "*index*" 会帮你把所有名字带 index 的文件全部列出。'
  },
  {
    command: 'du -sh * | sort -rh',
    title: '一键排查当前目录下体积最大的大文件 / 文件夹',
    category: 'file',
    categoryLabel: '文件与目录',
    description: '统计当前层级下所有文件夹和文件的总体大小，并转换成人类易读的 K/M/G 单位，最后按体积降序排队展示。',
    explanation: 'du -sh 计算总额 (human-readable)，sort -rh 会以反向 (-r) 人类可读数字 (-h) 进行排序，是硬盘快满时的找垃圾救星。'
  },
  {
    command: 'tail -f -n 200 /var/log/nginx/access.log',
    title: '实时动态追随式滚动观察最新写入的日志',
    category: 'file',
    categoryLabel: '文件与目录',
    description: '在终端窗口持续挂起，当服务端被用户访问并写入新日志行时，终端会像流媒体一样实时同步刷出最近的 200 行记录。',
    explanation: '-f (follow) 实时追加监听，-n 200 设定首屏显示先拉取历史尾部的 200 行，多用于联调和排查即时异常。按 Ctrl+C 退出。'
  },

  // Permissions
  {
    command: 'chmod +x deploy.sh',
    title: '给 Shell 脚本赋予可执行权限',
    category: 'permission',
    categoryLabel: '用户与权限',
    description: '为当前脚本或程序文件加上执行 (Execute, x) 标志。如果未赋权，直接运行该脚本会报错 “Permission Denied” 拒绝执行。',
    explanation: '+x 标志代表增量加入执行权。等价的数字操作是 chmod 755 deploy.sh。'
  },
  {
    command: 'chmod 600 ~/.ssh/id_rsa',
    title: '加固 SSH 私钥文件的安全性读写权限',
    category: 'permission',
    categoryLabel: '用户与权限',
    description: '将敏感的 SSH 个人私钥权限缩紧，只允许属主进行读写，限制同服务器上的其他任意组成员或游客读取。',
    explanation: '这是 SSH 协议的硬性要求，如果密钥权限太宽松（如 777 或 755），SSH 连接会报 “Unprotected private key” 错并拒绝连线。'
  },
  {
    command: 'chown -R www-data:www-data /var/www/html',
    title: '递归修改文件/目录的所属用户和用户组',
    category: 'permission',
    categoryLabel: '用户与权限',
    description: '将网页服务器对应的整个主目录，其下所有的子文件夹和文件，全部重新划归给 Web 守护进程 www-data（或 nginx）读写。',
    explanation: '-R 代表递归，www-data:www-data 前者是新属主用户名，冒号后面是新属组名，常用于解决由于权限错误导致的上传失败或 403 Forbidden。'
  },

  // Compression
  {
    command: 'tar -zcvf backup.tar.gz /var/www/my-app',
    title: '将整个文件夹打包并压缩为 .tar.gz 包',
    category: 'archive',
    categoryLabel: '打包与压缩',
    description: '使用 Gzip 压缩算法将指定的物理文件夹打包成一个极小、高抗损的二进制压缩包文件，便于上传、下载或异地备份。',
    explanation: '-z (调用gzip压缩), -c (create创建新归档), -v (verbose打印打包细节), -f (指定压缩文件名)。'
  },
  {
    command: 'tar -zxvf backup.tar.gz -C /var/www/dist',
    title: '解压 .tar.gz 压缩包到目标文件夹下',
    category: 'archive',
    categoryLabel: '打包与压缩',
    description: '将打包好的 gzip 归档文件重新在指定的物理磁盘目录中还原解压，并自动创建目录树层级。',
    explanation: '-x (extract解包提取), -C (change-dir将解压输出导向指定的非当前文件夹路径)。'
  },
  {
    command: 'unzip build.zip -d /var/www/app',
    title: '解压 .zip 压缩文件并指定存放目录',
    category: 'archive',
    categoryLabel: '打包与压缩',
    description: '对从 Windows/Mac 传递或打包的 ZIP 通用文件在 Linux 终端进行极速解包，通过 -d 指定存放路径。',
    explanation: '-d (directory) 指定释放目录。如果系统提示 unzip 未找到命令，可使用 apt install unzip 轻松安装。'
  },

  // Hardware & System
  {
    command: 'free -h',
    title: '快速查询物理内存与 Swap 虚拟内存分配',
    category: 'system',
    categoryLabel: '系统与硬件',
    description: '显示总共、已用、空闲、共享、缓存缓冲区（Buffers/Cache）各是多少，并采用以 M/G 为单位的易读单位。',
    explanation: '注意：Linux 底层常把多余闲置物理内存挪给 Cache 作磁盘缓存，因此 free 一栏较小不代表内存不够，主要看 available（可用额）。'
  },
  {
    command: 'df -h',
    title: '一键获取系统各硬盘分区磁盘占有率',
    category: 'system',
    categoryLabel: '系统与硬件',
    description: '展示所有挂载中的物理硬盘分区已用空间百分比、可用大小、挂载节点，防止磁盘写满导致崩溃。',
    explanation: '如果根分区 `/` 占用达到 100%，系统将出现无法创建临时文件、Session失效、各种数据库停止写入的灾难性故障。'
  },
  {
    command: 'uptime',
    title: '查看服务器持续稳定开机时长与负载指标',
    category: 'system',
    categoryLabel: '系统与硬件',
    description: '获取系统当前时间、已平稳连续不宕机运行多久、当前连接的远程终端数、最近 1分钟、5分钟、15分钟的 CPU 任务队列负载。',
    explanation: '系统负载（Load Average）值若长期大于你的 CPU 总核心数，意味着服务器出现计算任务排队拥堵，需要优化或扩容。'
  },
  {
    command: 'history | grep "ssh"',
    title: '在历史输入命令记录中模糊搜索 SSH 指令',
    category: 'system',
    categoryLabel: '系统与硬件',
    description: '过滤查阅当前账号在当前主机中之前打过的命令历史，回溯配置或登录过的历史遗留语句。',
    explanation: 'history 默认保留 1000-2000 行命令记录。在检索出来的行首有对应行号，可以使用 !行号 瞬间重复运行此条指令。'
  },
  {
    command: 'openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private_pkcs1.key -out private_pkcs8.key',
    title: 'RSA 私钥格式转换 (PKCS#1 转 PKCS#8)',
    category: 'permission',
    categoryLabel: '用户与权限',
    description: '将传统旧版的 PKCS#1 私钥格式（以 BEGIN RSA PRIVATE KEY 开头）转换为现代标准的 PKCS#8 格式（以 BEGIN PRIVATE KEY 开头），常用于 Java / JWT 库。',
    explanation: '-topk8 选项控制升级至 PKCS#8 标准格式，-nocrypt 表示生成不经对称加密密码保护的明文私钥。'
  },
  {
    command: 'openssl rsa -in private_pkcs8.key -out private_pkcs1.key',
    title: 'RSA 私钥格式转换 (PKCS#8 转 PKCS#1)',
    category: 'permission',
    categoryLabel: '用户与权限',
    description: '将现代标准的 PKCS#8 格式私钥转换回传统的、格式特定的 PKCS#1 格式（BEGIN RSA PRIVATE KEY）。',
    explanation: '通过默认的 openssl rsa 指令直接解析输入并输出传统的 PEM 私钥格式。'
  },
  {
    command: 'openssl rsa -in private.key -pubout -out public_pkcs8.pem',
    title: '从私钥导出 PKCS#8 格式标准公钥',
    category: 'permission',
    categoryLabel: '用户与权限',
    description: '读取指定的私钥文件，并导出提取其对应的 PKCS#8 标准格式公钥（BEGIN PUBLIC KEY）。此格式被最广泛的后端系统（如 Node.js, JWT）使用。',
    explanation: '-pubout 代表提取公钥输出。该公钥最常在应用代码中用来验证签名。'
  }
];

export const LinuxCommandHelper: React.FC<LinuxCommandHelperProps> = ({ onRecordUsage }) => {
  const [activeTab, setActiveTab] = useState<'grep' | 'cron' | 'devops' | 'database'>('grep');

  // --- GREP BUILDER STATES ---
  const [logPathType, setLogPathType] = useState<string>('nginx-access');
  const [customLogPath, setCustomLogPath] = useState<string>('/var/log/myapp/error.log');
  const [keyword, setKeyword] = useState<string>('/api/v1/user');
  const [useDateFilter, setUseDateFilter] = useState<boolean>(true);
  const [dateStr, setDateStr] = useState<string>(''); // e.g., 08/Jul/2026 or 2026-07-08
  const [useTimeFilter, setUseTimeFilter] = useState<boolean>(false);
  const [hourStr, setHourStr] = useState<string>('10'); // 10 o'clock
  const [minuteStr, setMinuteStr] = useState<string>(''); // specific minute
  
  const [caseInsensitive, setCaseInsensitive] = useState<boolean>(false);
  const [invertMatch, setInvertMatch] = useState<boolean>(false);
  const [outputMode, setOutputMode] = useState<'list' | 'count' | 'context' | 'awk-ip'>('list');
  const [contextLines, setContextLines] = useState<number>(5);
  const [limitLines, setLimitLines] = useState<number>(100);
  const [useTail, setUseTail] = useState<boolean>(false);

  // --- DEVOPS QUICK COMMANDS STATES ---
  const [portInput, setPortInput] = useState<string>('3000');
  const [processName, setProcessName] = useState<string>('node');
  const [nginxConfPath, setNginxConfPath] = useState<string>('/etc/nginx/nginx.conf');
  const [dockerContainerId, setDockerContainerId] = useState<string>('myapp-web-1');
  const [maxFindSize, setMaxFindSize] = useState<string>('+100M');

  // --- COMMAND DATABASE STATES ---
  const [dbSearchQuery, setDbSearchQuery] = useState<string>('');
  const [dbSelectedCategory, setDbSelectedCategory] = useState<string>('all');

  // --- CRONTAB STATES ---
  const [cronMinute, setCronMinute] = useState<string>('*');
  const [cronHour, setCronHour] = useState<string>('*');
  const [cronDay, setCronDay] = useState<string>('*');
  const [cronMonth, setCronMonth] = useState<string>('*');
  const [cronWeekday, setCronWeekday] = useState<string>('*');
  const [cronCommand, setCronCommand] = useState<string>('/usr/bin/python3 /app/backup.py >> /var/log/backup.log 2>&1');

  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Set today's date in Nginx (DD/MMM/YYYY) format & system format on component load
  useEffect(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    setDateStr(`${day}/${month}/${year}`);
  }, []);

  const handleCopy = (text: string) => {
    onRecordUsage();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  };

  // Resolve actual log file path based on dropdown
  const getLogFilePath = () => {
    switch (logPathType) {
      case 'nginx-access': return '/var/log/nginx/access.log';
      case 'nginx-error': return '/var/log/nginx/error.log';
      case 'pm2-out': return '~/.pm2/logs/app-out.log';
      case 'pm2-err': return '~/.pm2/logs/app-error.log';
      case 'syslog': return '/var/log/syslog';
      case 'custom': return customLogPath;
      default: return '/var/log/nginx/access.log';
    }
  };

  // --- GENERATE GREP COMMAND ---
  const generateGrepCommand = () => {
    const logFile = getLogFilePath();
    let parts: string[] = [];

    // Begin with tail -n if requested to search only recent history
    if (useTail) {
      parts.push(`tail -n ${limitLines} ${logFile}`);
    }

    // Prepare primary grep search
    let grepCmd = 'grep';
    let grepFlags = '';
    if (caseInsensitive) grepFlags += 'i';
    
    // If context lines requested
    if (outputMode === 'context' && contextLines > 0) {
      grepFlags += ` -C ${contextLines}`;
    }

    if (grepFlags) {
      grepCmd += ` -${grepFlags.trim()}`;
    }

    // Escape keyword for shell if needed
    const escapedKeyword = keyword ? `"${keyword}"` : '';

    // If we're not tailing, we grep directly on the file
    const fileArg = useTail ? '' : ` ${logFile}`;

    // Combine grep parts
    let mainSearch = '';
    if (escapedKeyword) {
      mainSearch = `${grepCmd} ${escapedKeyword}${fileArg}`;
    } else {
      mainSearch = useTail ? 'cat' : `cat ${logFile}`;
    }

    parts.push(mainSearch);

    // Date/Time Filtering Integration
    if (useDateFilter && dateStr) {
      let timePattern = dateStr;
      if (useTimeFilter && hourStr) {
        timePattern += `:${hourStr}`;
        if (minuteStr) {
          timePattern += `:${minuteStr}`;
        }
      }
      parts.push(`grep "${timePattern}"`);
    }

    // Invert match (exclude keywords)
    if (invertMatch) {
      parts.push(`grep -v "${invertMatch}"`);
    }

    // Handling output processing modes
    if (outputMode === 'count') {
      parts.push('wc -l');
    } else if (outputMode === 'awk-ip') {
      // Analyze unique Nginx access logs IP addresses
      parts.push(`awk '{print $1}'`);
      parts.push('sort');
      parts.push('uniq -c');
      parts.push('sort -nr');
      parts.push('head -n 10');
    }

    // Assemble pipes
    // Filter empty commands
    const finalCmd = parts.filter(p => p.trim() !== '').join(' | ');
    return finalCmd;
  };

  // Command explanation breakdown
  const getGrepExplanation = () => {
    const logFile = getLogFilePath();
    const explanation = [];

    if (useTail) {
      explanation.push({ cmd: `tail -n ${limitLines} ${logFile}`, desc: `读取日志文件最后 ${limitLines} 行，防止对巨型日志进行全量扫描，提高速度并防卡死。` });
    }

    const keywordStr = keyword ? `“${keyword}”` : '任意内容';
    const caseStr = caseInsensitive ? '（忽略大小写）' : '';
    const fileDesc = useTail ? '输入流' : `“${logFile}” 文件`;

    explanation.push({ 
      cmd: `grep ${caseInsensitive ? '-i ' : ''}${keyword ? `"${keyword}"` : ''}`, 
      desc: `在${fileDesc}中过滤并提取包含 ${keywordStr} 的行${caseStr}。` 
    });

    if (useDateFilter && dateStr) {
      let pattern = dateStr;
      let timeDesc = `日期为 [${dateStr}]`;
      if (useTimeFilter && hourStr) {
        pattern += `:${hourStr}`;
        timeDesc += ` 且处于 [${hourStr}点]`;
        if (minuteStr) {
          pattern += `:${minuteStr}`;
          timeDesc += ` [${minuteStr}分]`;
        }
      }
      explanation.push({ cmd: `grep "${pattern}"`, desc: `二次精准定位，仅筛选出符合 ${timeDesc} 的访问/错误记录。` });
    }

    if (outputMode === 'count') {
      explanation.push({ cmd: 'wc -l', desc: '统计最终匹配到的日志总行数（即接口被请求的总次数）。' });
    } else if (outputMode === 'awk-ip') {
      explanation.push({ cmd: "awk '{print $1}'", desc: '提取日志每行的第一个字段（在标准 Nginx 中对应客户端 IP 地址）。' });
      explanation.push({ cmd: "sort | uniq -c | sort -nr", desc: '对所有 IP 地址进行排序，去重并汇总计数，最后按请求量从高到低进行倒序排列。' });
      explanation.push({ cmd: "head -n 10", desc: '仅截取并展示访问量排名前 10 位的“常客” IP 地址。' });
    } else if (outputMode === 'context' && contextLines > 0) {
      explanation.push({ cmd: `-C ${contextLines}`, desc: `同时输出匹配行前后各 ${contextLines} 行的上下文内容，便于研判报错堆栈。` });
    }

    return explanation;
  };

  const GREP_PRESETS = [
    { name: '查询 500 服务器错误', log: 'nginx-error', key: '500', useDate: true, outMode: 'list' },
    { name: '分析最热访问 IP Top10', log: 'nginx-access', key: 'GET', useDate: true, outMode: 'awk-ip' },
    { name: '排查 API 耗时与超时', log: 'pm2-out', key: 'timeout', useDate: false, outMode: 'context' }
  ];

  const applyGrepPreset = (preset: typeof GREP_PRESETS[0]) => {
    onRecordUsage();
    setLogPathType(preset.log);
    setKeyword(preset.key);
    setUseDateFilter(preset.useDate);
    setOutputMode(preset.outMode as any);
  };

  // --- GENERATE CRON COMMANDS ---
  const generateCronCommand = () => {
    return `${cronMinute} ${cronHour} ${cronDay} ${cronMonth} ${cronWeekday} ${cronCommand}`;
  };

  const getCronExplanation = () => {
    const explainField = (val: string, type: 'min' | 'hour' | 'day' | 'month' | 'week') => {
      if (val === '*') {
        switch (type) {
          case 'min': return '每分钟触发一次';
          case 'hour': return '每小时触发一次';
          case 'day': return '当月的每一天都触发';
          case 'month': return '每月的每一天都触发';
          case 'week': return '一周之中的任意一天都触发';
        }
      }
      if (val.startsWith('*/')) {
        const num = val.substring(2);
        switch (type) {
          case 'min': return `每隔 ${num} 分钟执行一次`;
          case 'hour': return `每隔 ${num} 小时执行一次`;
          case 'day': return `每隔 ${num} 天执行一次`;
          case 'month': return `每隔 ${num} 个月执行一次`;
          case 'week': return `每隔 ${num} 天执行一次`;
        }
      }
      return `在特定的时间点 [ ${val} ] 触发`;
    };

    return [
      { field: '分钟 (Minute)', val: cronMinute, desc: explainField(cronMinute, 'min'), range: '0-59' },
      { field: '小时 (Hour)', val: cronHour, desc: explainField(cronHour, 'hour'), range: '0-23' },
      { field: '日期 (Day of Month)', val: cronDay, desc: explainField(cronDay, 'day'), range: '1-31' },
      { field: '月份 (Month)', val: cronMonth, desc: explainField(cronMonth, 'month'), range: '1-12' },
      { field: '星期 (Day of Week)', val: cronWeekday, desc: explainField(cronWeekday, 'week'), range: '0-7 (0/7代表周日)' }
    ];
  };

  // --- FILTERED COMMAND DATABASE ---
  const filteredDbCommands = LINUX_COMMANDS_DB.filter(cmd => {
    const matchCategory = dbSelectedCategory === 'all' || cmd.category === dbSelectedCategory;
    const searchLower = dbSearchQuery.toLowerCase().trim();
    const matchSearch = !searchLower || 
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.command.toLowerCase().includes(searchLower) ||
      cmd.description.toLowerCase().includes(searchLower) ||
      cmd.explanation.toLowerCase().includes(searchLower) ||
      cmd.categoryLabel.toLowerCase().includes(searchLower);
    return matchCategory && matchSearch;
  });

  const categories = [
    { id: 'all', label: '全部命令', icon: 'Layers', color: 'bg-slate-100 text-slate-800' },
    { id: 'process', label: '进程与服务', icon: 'Activity', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'network', label: '网络与端口', icon: 'Wifi', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'file', label: '文件与目录', icon: 'FolderOpen', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'permission', label: '用户与权限', icon: 'Shield', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    { id: 'archive', label: '打包与压缩', icon: 'Box', color: 'bg-rose-50 text-rose-800 border-rose-200' },
    { id: 'system', label: '系统与硬件', icon: 'Cpu', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  ];

  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return LINUX_COMMANDS_DB.length;
    return LINUX_COMMANDS_DB.filter(c => c.category === catId).length;
  };

  return (
    <div id="linux-command-helper-root" className="max-w-7xl mx-auto p-1 animate-fade-in flex flex-col gap-6">
      
      {/* Title Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl">
            <Icon name="Terminal" size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Linux 常用命令与日志 Grep 辅助面板</h3>
            <p className="text-slate-500 text-xs mt-0.5">帮助开发者极速组装日志分析语句与运维高频命令，提供完备命令释义，即点即拷，消除记忆痛点。</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl self-stretch lg:self-auto gap-1">
          <button
            onClick={() => { setActiveTab('grep'); onRecordUsage(); }}
            className={`flex-1 lg:flex-initial text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'grep' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
            }`}
          >
            <Icon name="Search" size={13} />
            Grep 日志过滤
          </button>
          <button
            onClick={() => { setActiveTab('cron'); onRecordUsage(); }}
            className={`flex-1 lg:flex-initial text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cron' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
            }`}
          >
            <Icon name="Clock" size={13} />
            Cron 表达式
          </button>
          <button
            onClick={() => { setActiveTab('devops'); onRecordUsage(); }}
            className={`flex-1 lg:flex-initial text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'devops' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
            }`}
          >
            <Icon name="Server" size={13} />
            运维指令速查
          </button>
          <button
            onClick={() => { setActiveTab('database'); onRecordUsage(); }}
            className={`flex-1 lg:flex-initial text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'database' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
            }`}
          >
            <Icon name="BookOpen" size={13} />
            命令大全
          </button>
        </div>
      </div>

      {/* --- TAB 1: INTERACTIVE GREP BUILDER --- */}
      {activeTab === 'grep' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Settings Left Column - 5 cols */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="Sliders" className="text-slate-900" size={16} />
              过滤逻辑配置面板
            </h4>

            {/* Quick Presets */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">典型分析场景预设</span>
              <div className="flex flex-wrap gap-1.5">
                {GREP_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyGrepPreset(p)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 hover:text-slate-900 font-semibold px-2.5 py-1.5 rounded-md text-slate-700 cursor-pointer transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-slate-100 my-1" />

            {/* Step 1: File selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">1. 选择日志文件源 (Log File)</label>
              <select
                value={logPathType}
                onChange={(e) => setLogPathType(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-bold text-slate-800 focus:ring-1 focus:ring-black"
              >
                <option value="nginx-access">Nginx 访问日志 (access.log)</option>
                <option value="nginx-error">Nginx 错误日志 (error.log)</option>
                <option value="pm2-out">Node / PM2 控制台输出 (app-out.log)</option>
                <option value="pm2-err">Node / PM2 异常捕获 (app-error.log)</option>
                <option value="syslog">Linux 系统日志 (/var/log/syslog)</option>
                <option value="custom">✍️ 手动输入自定义路径...</option>
              </select>

              {logPathType === 'custom' && (
                <input
                  type="text"
                  value={customLogPath}
                  onChange={(e) => setCustomLogPath(e.target.value)}
                  placeholder="如: /var/log/nginx/custom_domain.log"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-semibold text-slate-800 mt-2 focus:ring-1 focus:ring-black"
                />
              )}
            </div>

            {/* Step 2: Search keyword */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">2. 输入核心查询词 / 接口名称 (Keyword)</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="例如: /api/user/login 或 500 或 Exception"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-semibold text-slate-800 focus:ring-1 focus:ring-black"
              />
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-1 text-xs text-slate-600 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={caseInsensitive}
                    onChange={(e) => setCaseInsensitive(e.target.checked)}
                    className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                  />
                  忽略英文大小写 (-i)
                </label>

                <label className="flex items-center gap-1 text-xs text-slate-600 font-medium cursor-pointer select-none" title="排除包含此内容的行">
                  <input
                    type="checkbox"
                    checked={invertMatch}
                    onChange={(e) => setInvertMatch(e.target.checked)}
                    className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                  />
                  排除匹配词 (-v)
                </label>
              </div>
            </div>

            {/* Step 3: Date/Time Filter */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useDateFilter}
                    onChange={(e) => setUseDateFilter(e.target.checked)}
                    className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                  />
                  3. 开启日期与时刻过滤
                </label>
              </div>

              {useDateFilter && (
                <div className="flex flex-col gap-2.5 mt-2 animate-fade-in">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">特定日期格式（符合 Nginx：日/月/年）</label>
                    <input
                      type="text"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      placeholder="例如: 08/Jul/2026 或 2026-07-08"
                      className="w-full text-xs bg-white border border-slate-200 rounded-md py-1 px-2 font-mono font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 text-xs text-slate-600 font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useTimeFilter}
                        onChange={(e) => setUseTimeFilter(e.target.checked)}
                        className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                      />
                      精准过滤到时/分
                    </label>
                  </div>

                  {useTimeFilter && (
                    <div className="grid grid-cols-2 gap-2 animate-fade-in">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">小时 (24h格式)</label>
                        <input
                          type="text"
                          value={hourStr}
                          onChange={(e) => setHourStr(e.target.value)}
                          placeholder="例如: 15"
                          className="w-full text-xs bg-white border border-slate-200 rounded-md py-1 px-2 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">分钟 (可选)</label>
                        <input
                          type="text"
                          value={minuteStr}
                          onChange={(e) => setMinuteStr(e.target.value)}
                          placeholder="空代表整小时"
                          className="w-full text-xs bg-white border border-slate-200 rounded-md py-1 px-2 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Scan Optimization */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useTail}
                  onChange={(e) => setUseTail(e.target.checked)}
                  className="rounded-sm border-slate-300 text-slate-900 focus:ring-black/20 h-3.5 w-3.5 cursor-pointer accent-slate-900"
                />
                4. 限制扫描行数 (避免日志太大卡顿)
              </label>
            </div>

            {useTail && (
              <div className="pl-5 animate-fade-in">
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">扫描最近行数：</label>
                <select
                  value={limitLines}
                  onChange={(e) => setLimitLines(parseInt(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md py-1 px-2 font-bold text-slate-700"
                >
                  <option value={50}>末尾 50 行</option>
                  <option value={100}>末尾 100 行</option>
                  <option value={500}>末尾 500 行</option>
                  <option value={2000}>末尾 2000 行</option>
                </select>
              </div>
            )}

            {/* Step 5: Output Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">5. 输出展现及数据统计模式</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setOutputMode('list'); onRecordUsage(); }}
                  className={`text-xs py-2 px-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    outputMode === 'list'
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon name="Menu" size={12} />
                  展示匹配行 (列表)
                </button>

                <button
                  type="button"
                  onClick={() => { setOutputMode('count'); onRecordUsage(); }}
                  className={`text-xs py-2 px-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    outputMode === 'count'
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon name="Hash" size={12} />
                  仅统计条数 (Count)
                </button>

                <button
                  type="button"
                  onClick={() => { setOutputMode('context'); onRecordUsage(); }}
                  className={`text-xs py-2 px-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    outputMode === 'context'
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon name="Layers" size={12} />
                  查看上下文明细
                </button>

                <button
                  type="button"
                  onClick={() => { setOutputMode('awk-ip'); onRecordUsage(); }}
                  className={`text-xs py-2 px-2.5 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    outputMode === 'awk-ip'
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon name="Users" size={12} />
                  分析独立 IP Top10
                </button>
              </div>

              {outputMode === 'context' && (
                <div className="mt-2.5 bg-slate-50 p-2.5 rounded-md border border-slate-200 flex items-center gap-2 animate-fade-in">
                  <span className="text-xs text-slate-600 font-semibold">前后关联行数:</span>
                  <input
                    type="number"
                    value={contextLines}
                    onChange={(e) => setContextLines(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-xs text-center font-bold bg-white border border-slate-200 rounded-md py-1"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Interactive Preview Right Column - 7 cols */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Command Display Terminal Card */}
            <div className="bg-slate-900 rounded-xl border border-slate-950 overflow-hidden shadow-md flex flex-col">
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-2 font-mono">
                  <Icon name="CommandLine" size={14} className="text-emerald-500" />
                  GENERATED_SHELL_COMMAND
                </span>
                <button
                  onClick={() => handleCopy(generateGrepCommand())}
                  className="text-[11px] bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-500/10"
                >
                  <Icon name={copiedText === generateGrepCommand() ? 'Check' : 'Copy'} size={12} />
                  {copiedText === generateGrepCommand() ? '已复制' : '复制命令'}
                </button>
              </div>

              {/* Terminal Code Body */}
              <div className="p-5 font-mono text-sm leading-relaxed text-emerald-300 bg-slate-950 whitespace-pre-wrap select-all">
                {generateGrepCommand()}
              </div>
            </div>

            {/* Instruction / Step by step details */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Icon name="Compass" className="text-slate-500" size={16} />
                命令结构化逻辑剖析 (How it works)
              </h4>

              <div className="flex flex-col gap-4 mt-4">
                {getGrepExplanation().map((step, idx) => (
                  <div key={idx} className="flex gap-4 items-start text-xs leading-relaxed">
                    <span className="font-mono bg-slate-100 text-slate-800 border border-slate-200 rounded-md px-2 py-0.5 whitespace-nowrap font-bold">
                      步骤 {idx + 1}
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

              {/* Educational Note */}
              <div className="mt-5 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900 block mb-1">💡 运维速查知识点：</strong>
                Nginx 的标准访问日志日期格式形如 <code className="font-mono bg-white px-1 border border-slate-200 rounded text-slate-800 font-bold">08/Jul/2026:15:30:22</code>。
                我们在通过 grep 精准检索具体时段日志时，需将斜杠、冒号完全拼对，即可免除对几个G的庞大文件采用记事本直接打开导致挂起崩溃的尴尬。
              </div>
            </div>

          </div>
        </div>
      )}



      {/* --- TAB: CRONTAB HELPER --- */}
      {activeTab === 'cron' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Settings Left Column - 5 cols */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="Sliders" className="text-slate-900" size={16} />
              Crontab 表达式拼装
            </h4>

            {/* Quick Presets for Crontab */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">快速套用高频定时预设</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: '每 5 分钟', m: '*/5', h: '*', d: '*', mon: '*', w: '*' },
                  { label: '每 30 分钟', m: '*/30', h: '*', d: '*', mon: '*', w: '*' },
                  { label: '每小时整点', m: '0', h: '*', d: '*', mon: '*', w: '*' },
                  { label: '每天凌晨 2:00', m: '0', h: '2', d: '*', mon: '*', w: '*' },
                  { label: '每周一凌晨 3:00', m: '0', h: '3', d: '*', mon: '*', w: '1' },
                  { label: '每月1号凌晨 4:00', m: '0', h: '4', d: '1', mon: '*', w: '*' }
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setCronMinute(p.m);
                      setCronHour(p.h);
                      setCronDay(p.d);
                      setCronMonth(p.mon);
                      setCronWeekday(p.w);
                      onRecordUsage();
                    }}
                    className="text-[10px] bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 font-bold px-2 py-1.5 rounded text-slate-600 cursor-pointer transition-all text-center"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-slate-100 my-1" />

            {/* 5 Field Inputs */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">微调 5 维时间占位字段：</span>

              <div className="grid grid-cols-5 gap-1.5 font-mono">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1 text-center">分(Min)</label>
                  <input
                    type="text"
                    value={cronMinute}
                    onChange={(e) => setCronMinute(e.target.value)}
                    className="w-full text-center text-xs bg-slate-50 border border-slate-200 rounded py-1 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1 text-center">时(Hour)</label>
                  <input
                    type="text"
                    value={cronHour}
                    onChange={(e) => setCronHour(e.target.value)}
                    className="w-full text-center text-xs bg-slate-50 border border-slate-200 rounded py-1 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1 text-center">日(Day)</label>
                  <input
                    type="text"
                    value={cronDay}
                    onChange={(e) => setCronDay(e.target.value)}
                    className="w-full text-center text-xs bg-slate-50 border border-slate-200 rounded py-1 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1 text-center">月(Mon)</label>
                  <input
                    type="text"
                    value={cronMonth}
                    onChange={(e) => setCronMonth(e.target.value)}
                    className="w-full text-center text-xs bg-slate-50 border border-slate-200 rounded py-1 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1 text-center">周(Week)</label>
                  <input
                    type="text"
                    value={cronWeekday}
                    onChange={(e) => setCronWeekday(e.target.value)}
                    className="w-full text-center text-xs bg-slate-50 border border-slate-200 rounded py-1 font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Execute target script */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">4. 定期触发的执行命令</label>
              <textarea
                rows={2}
                value={cronCommand}
                onChange={(e) => setCronCommand(e.target.value)}
                placeholder="例如: /usr/bin/python3 /app/script.py"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2.5 font-mono font-bold text-slate-800 focus:ring-1 focus:ring-black resize-none"
              />
            </div>

          </div>

          {/* Interactive Preview Right Column - 7 cols */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Command Display Terminal Card */}
            <div className="bg-slate-900 rounded-xl border border-slate-950 overflow-hidden shadow-md flex flex-col">
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-2 font-mono">
                  <Icon name="CommandLine" size={14} className="text-emerald-500" />
                  CRONTAB_ENTRY_LINE
                </span>
                <button
                  onClick={() => handleCopy(generateCronCommand())}
                  className="text-[11px] bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-500/10"
                >
                  <Icon name={copiedText === generateCronCommand() ? 'Check' : 'Copy'} size={12} />
                  {copiedText === generateCronCommand() ? '已复制' : '复制命令'}
                </button>
              </div>

              {/* Terminal Code Body */}
              <div className="p-5 font-mono text-sm leading-relaxed text-emerald-300 bg-slate-950 whitespace-pre-wrap select-all">
                {generateCronCommand()}
              </div>
            </div>

            {/* Field breakdown parsing */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Icon name="Compass" className="text-slate-500" size={16} />
                定时表达式多维释义
              </h4>

              <div className="flex flex-col gap-3 mt-4">
                {getCronExplanation().map((field, idx) => (
                  <div key={idx} className="flex gap-4 items-center text-xs border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-700 w-36">
                      {field.field}
                    </span>
                    <span className="font-mono bg-slate-100 text-slate-900 px-2 py-0.5 rounded font-bold w-12 text-center border border-slate-200">
                      {field.val}
                    </span>
                    <span className="text-slate-500 flex-1 font-medium text-[11px]">
                      {field.desc}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      范围: {field.range}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick deployment instructions */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Icon name="Server" size={14} className="text-slate-500" />
                如何将定时任务配置到 Linux 系统中？
              </h4>
              <div className="text-xs text-slate-600 font-medium leading-relaxed space-y-2.5">
                <p>1. 在 Linux 命令行中执行以下指令，开启当前用户的定时任务编辑器：</p>
                <div className="bg-slate-900 text-emerald-400 font-mono p-2.5 rounded border border-slate-950 select-all flex justify-between items-center">
                  <span>crontab -e</span>
                  <button onClick={() => handleCopy('crontab -e')} className="text-slate-500 hover:text-slate-300">
                    <Icon name={copiedText === 'crontab -e' ? 'Check' : 'Copy'} size={12} />
                  </button>
                </div>
                <p>2. 在打开的编辑器底部，新增一行，粘贴上方生成的 <strong className="text-slate-900">CRONTAB_ENTRY_LINE</strong> 语句，保存并退出（如果使用 Vi/Vim，请依次敲击 <code className="font-bold bg-white border border-slate-200 px-1 rounded">Esc</code> 并输入 <code className="font-bold bg-white border border-slate-200 px-1 rounded">:wq</code> 后回车）。</p>
                <p>3. 可以通过以下指令列出当前账户所有的定时任务配置，确保写入成功：</p>
                <div className="bg-slate-900 text-emerald-400 font-mono p-2.5 rounded border border-slate-950 select-all flex justify-between items-center">
                  <span>crontab -l</span>
                  <button onClick={() => handleCopy('crontab -l')} className="text-slate-500 hover:text-slate-300">
                    <Icon name={copiedText === 'crontab -l' ? 'Check' : 'Copy'} size={12} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 2: COMMON DEVOPS QUICK REFERENCE --- */}
      {activeTab === 'devops' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          
          {/* Nginx & Web Server Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="Cpu" className="text-slate-900" size={16} />
              Nginx Web 服务管理 (Nginx Server)
            </h4>

            {/* Nginx path variable */}
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1">调整配置文件路径：</label>
              <input
                type="text"
                value={nginxConfPath}
                onChange={(e) => setNginxConfPath(e.target.value)}
                placeholder="如: /etc/nginx/nginx.conf"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-1 px-2 font-mono font-bold"
              />
            </div>

            {/* Commands list */}
            <div className="flex flex-col gap-3.5 mt-1">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">1. 查看 Nginx 当前运行的主子进程状态</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">ps -ef | grep nginx</span>
                  <button onClick={() => handleCopy('ps -ef | grep nginx')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === 'ps -ef | grep nginx' ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">2. 检测 Nginx 配置文件语法是否正确</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">nginx -t -c {nginxConfPath}</span>
                  <button onClick={() => handleCopy(`nginx -t -c ${nginxConfPath}`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === `nginx -t -c ${nginxConfPath}` ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">3. 平滑热重载配置文件 (不丢失当前连接)</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">nginx -s reload</span>
                  <button onClick={() => handleCopy('nginx -s reload')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === 'nginx -s reload' ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">4. 查看 Nginx 服务的 Systemd 活动状态</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">systemctl status nginx</span>
                  <button onClick={() => handleCopy('systemctl status nginx')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === 'systemctl status nginx' ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">5. 实时追踪 Nginx 标准访问日志流</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">tail -f /var/log/nginx/access.log</span>
                  <button onClick={() => handleCopy('tail -f /var/log/nginx/access.log')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === 'tail -f /var/log/nginx/access.log' ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Network & Ports Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="Wifi" className="text-slate-900" size={16} />
              网卡与网络端口 (Ports & Network)
            </h4>

            {/* Port input variable */}
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1">调整待查端口号：</label>
              <input
                type="text"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                placeholder="如: 3000, 80"
                className="w-24 text-xs bg-slate-50 border border-slate-200 rounded-md py-1 px-2 font-mono font-bold"
              />
            </div>

            {/* Commands list */}
            <div className="flex flex-col gap-3.5 mt-1">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">1. 查询端口是否被占用 (lsof)</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">lsof -i :{portInput}</span>
                  <button onClick={() => handleCopy(`lsof -i :${portInput}`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === `lsof -i :${portInput}` ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">2. 查看系统网络端口监听列表 (netstat)</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">netstat -tunlp | grep {portInput}</span>
                  <button onClick={() => handleCopy(`netstat -tunlp | grep ${portInput}`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === `netstat -tunlp | grep ${portInput}` ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">3. 直接强制杀掉占用该端口的进程</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">fuser -k {portInput}/tcp</span>
                  <button onClick={() => handleCopy(`fuser -k ${portInput}/tcp`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === `fuser -k ${portInput}/tcp` ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">4. 极速获取本机公网 IP 详情</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">curl ifconfig.me</span>
                  <button onClick={() => handleCopy('curl ifconfig.me')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === 'curl ifconfig.me' ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Processes & Services Management Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="Activity" className="text-slate-900" size={16} />
              进程与服务管理 (Processes)
            </h4>

            {/* Process Name input variable */}
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1">调整进程关键字：</label>
              <input
                type="text"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                placeholder="如: node, nginx"
                className="w-32 text-xs bg-slate-50 border border-slate-200 rounded-md py-1 px-2 font-mono font-bold"
              />
            </div>

            {/* Commands list */}
            <div className="flex flex-col gap-3.5 mt-1">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">1. 按名称查进程详情 (ps aux)</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">ps aux | grep {processName} | grep -v grep</span>
                  <button onClick={() => handleCopy(`ps aux | grep ${processName} | grep -v grep`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === `ps aux | grep ${processName} | grep -v grep` ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">2. 查询内存占用率前 10 位的进程</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">ps aux --sort=-%mem | head -10</span>
                  <button onClick={() => handleCopy('ps aux --sort=-%mem | head -10')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === 'ps aux --sort=-%mem | head -10' ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">3. 强制终止某个特定名称的所有进程 (pkill)</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">pkill -f {processName}</span>
                  <button onClick={() => handleCopy(`pkill -f ${processName}`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === `pkill -f ${processName}` ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Docker Operations Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="Box" className="text-slate-900" size={16} />
              Docker 容器运行与排错 (Docker)
            </h4>

            {/* Docker container id variable */}
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1">调整容器名 / ID：</label>
              <input
                type="text"
                value={dockerContainerId}
                onChange={(e) => setDockerContainerId(e.target.value)}
                placeholder="如: myapp-web-1"
                className="w-44 text-xs bg-slate-50 border border-slate-200 rounded-md py-1 px-2 font-mono font-bold"
              />
            </div>

            {/* Commands list */}
            <div className="flex flex-col gap-3.5 mt-1">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">1. 追踪容器最后 100 行日志 (实时滚动)</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">docker logs -f --tail 100 {dockerContainerId}</span>
                  <button onClick={() => handleCopy(`docker logs -f --tail 100 ${dockerContainerId}`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === `docker logs -f --tail 100 ${dockerContainerId}` ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">2. 查看所有容器资源 CPU/内存实时耗费详情</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">docker stats</span>
                  <button onClick={() => handleCopy('docker stats')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === 'docker stats' ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">3. 进入容器内部的交互式终端 (bash)</span>
                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                  <span className="text-slate-800 font-bold overflow-x-auto">docker exec -it {dockerContainerId} /bin/bash</span>
                  <button onClick={() => handleCopy(`docker exec -it ${dockerContainerId} /bin/bash`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                    <Icon name={copiedText === `docker exec -it ${dockerContainerId} /bin/bash` ? 'Check' : 'Copy'} size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hardware & Disk Storage Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4 md:col-span-2">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Icon name="HardDrive" className="text-slate-900" size={16} />
              系统性能、内存与文件查找 (Hardware & Search)
            </h4>

            {/* Variable size for find */}
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">检索大文件标准大小：</label>
                <input
                  type="text"
                  value={maxFindSize}
                  onChange={(e) => setMaxFindSize(e.target.value)}
                  placeholder="如: +100M, +1G"
                  className="w-24 text-xs bg-slate-50 border border-slate-200 rounded-md py-1 px-2 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3.5">
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">1. 查看系统硬盘各分区空间占用百分比</span>
                  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                    <span className="text-slate-800 font-bold overflow-x-auto">df -h</span>
                    <button onClick={() => handleCopy('df -h')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                      <Icon name={copiedText === 'df -h' ? 'Check' : 'Copy'} size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">2. 统计当前路径下所有一级目录占用空间大小</span>
                  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                    <span className="text-slate-800 font-bold overflow-x-auto">du -sh * | sort -rh</span>
                    <button onClick={() => handleCopy('du -sh * | sort -rh')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                      <Icon name={copiedText === 'du -sh * | sort -rh' ? 'Check' : 'Copy'} size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">3. 查看可用内存及 Swap 交换分区状态 (MB/GB)</span>
                  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                    <span className="text-slate-800 font-bold overflow-x-auto">free -h</span>
                    <button onClick={() => handleCopy('free -h')} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                      <Icon name={copiedText === 'free -h' ? 'Check' : 'Copy'} size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">4. 在当前目录下深度检索所有大于指定体积的文件</span>
                  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs">
                    <span className="text-slate-800 font-bold overflow-x-auto">find . -type f -size {maxFindSize} -exec ls -lh {"{}"} \;</span>
                    <button onClick={() => handleCopy(`find . -type f -size ${maxFindSize} -exec ls -lh "{}" \\;`)} className="text-slate-500 hover:text-slate-900 cursor-pointer">
                      <Icon name={copiedText === `find . -type f -size ${maxFindSize} -exec ls -lh "{}" \\;` ? 'Check' : 'Copy'} size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB 3: SEARCHABLE COMPREHENSIVE COMMAND DICTIONARY --- */}
      {activeTab === 'database' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Search Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Icon name="Search" size={16} />
                </div>
                <input
                  type="text"
                  value={dbSearchQuery}
                  onChange={(e) => setDbSearchQuery(e.target.value)}
                  placeholder="搜索命令或中文说明... (例如：进程、端口、Nginx、chown、权限)"
                  className="w-full text-sm bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-lg py-2.5 pl-10 pr-10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                />
                {dbSearchQuery && (
                  <button
                    onClick={() => setDbSearchQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Icon name="X" size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">分类目录：</span>
              {categories.map((cat) => {
                const isActive = dbSelectedCategory === cat.id;
                const count = getCategoryCount(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setDbSelectedCategory(cat.id); onRecordUsage(); }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon name={cat.icon} size={12} />
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>找到符合条件的 Linux 常用命令 <strong className="text-slate-800 font-bold">{filteredDbCommands.length}</strong> 条</span>
            {dbSearchQuery && (
              <button onClick={() => setDbSearchQuery('')} className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer">
                清除搜索条件
              </button>
            )}
          </div>

          {/* Database Grid */}
          {filteredDbCommands.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredDbCommands.map((cmdItem, index) => {
                const catInfo = categories.find(c => c.id === cmdItem.category);
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all p-5 flex flex-col gap-4 group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border self-start ${catInfo?.color || 'bg-slate-50 text-slate-600'}`}>
                          {cmdItem.categoryLabel}
                        </span>
                        <h5 className="font-bold text-slate-900 text-sm">{cmdItem.title}</h5>
                      </div>

                      {/* Spark of UI decoration */}
                      <span className="text-[10px] text-slate-300 font-mono select-none">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {cmdItem.description}
                    </p>

                    {/* Code Execution Panel */}
                    <div className="relative rounded-lg bg-slate-900 border border-slate-950 overflow-hidden flex items-stretch">
                      <div className="flex-1 font-mono text-xs text-emerald-300 p-3 overflow-x-auto whitespace-nowrap self-center select-all scrollbar-thin">
                        {cmdItem.command}
                      </div>
                      
                      <button
                        onClick={() => handleCopy(cmdItem.command)}
                        className="px-4.5 bg-slate-950 hover:bg-slate-800 border-l border-slate-850 text-slate-400 hover:text-emerald-400 transition-all flex items-center justify-center cursor-pointer group-hover:scale-100"
                        title="复制此命令"
                      >
                        <Icon name={copiedText === cmdItem.command ? 'Check' : 'Copy'} size={13} />
                      </button>
                    </div>

                    {/* How It Works Explanation */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
                        <Icon name="Compass" size={12} className="text-slate-400" />
                        <span>逻辑解析：</span>
                      </div>
                      <p className="text-slate-500 font-medium leading-relaxed">
                        {cmdItem.explanation}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                <Icon name="Inbox" size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">没有找到匹配的 Linux 命令</p>
                <p className="text-xs text-slate-400 mt-1">试着换一个关键词，或者在下方点击分类目录过滤。</p>
              </div>
              <button
                onClick={() => { setDbSearchQuery(''); setDbSelectedCategory('all'); }}
                className="mt-2 text-xs bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-800"
              >
                重置检索过滤器
              </button>
            </div>
          )}

          {/* Quick CheatSheet reference for common parameters */}
          <div className="bg-slate-900 rounded-xl border border-slate-950 p-5 text-slate-300">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Icon name="Terminal" size={14} className="text-emerald-500" />
              高频 Linux 参数通识速记
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono leading-relaxed">
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/60">
                <span className="text-emerald-400 font-bold block mb-1">ps 常用选项组</span>
                <span className="text-slate-400 block">-a : 显示现行终端机下的所有进程</span>
                <span className="text-slate-400 block">-u : 以用户为主的格式来展现</span>
                <span className="text-slate-400 block">-x : 包括没有控制终端的后台进程</span>
                <span className="text-slate-400 block">-e / -A : 列出所有完整进程</span>
                <span className="text-slate-400 block">-f : 绘制全格式或父子树层关系</span>
              </div>
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/60">
                <span className="text-emerald-400 font-bold block mb-1">tar 常用压缩解压</span>
                <span className="text-slate-400 block">-c : create 创建新的压缩档案</span>
                <span className="text-slate-400 block">-x : extract 提取解包</span>
                <span className="text-slate-400 block">-z : gzip 用 Gzip 算法压缩/解压</span>
                <span className="text-slate-400 block">-v : verbose 打印当前正在解的每个文件名</span>
                <span className="text-slate-400 block">-f : file 接下来指定最终文件名称</span>
              </div>
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800/60">
                <span className="text-emerald-400 font-bold block mb-1">grep 常用过滤模式</span>
                <span className="text-slate-400 block">-i : ignore-case 忽略大小写差异</span>
                <span className="text-slate-400 block">-v : invert-match 排除匹配成功的行</span>
                <span className="text-slate-400 block">-n : line-number 标出所在原文件的行号</span>
                <span className="text-slate-400 block">-c : count 统计含有特定词的总行数</span>
                <span className="text-slate-400 block">-r : recursive 递归检索目录下全部文件</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
