// 工具间数据传递:模块级单例(无 React hooks 依赖)
// 使用自定义事件 + 模块变量,避免 React Context 导致的多副本问题

interface PendingTransfer {
  toolId: string;
  data: string;
  timestamp: number;
}

let pendingTransfer: PendingTransfer | null = null;
let pickerOpen = false;
let pickerData: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export const toolBridge = {
  // 发送数据到目标工具
  sendToTool(toolId: string, data: string) {
    pendingTransfer = { toolId, data, timestamp: Date.now() };
    notify();
  },

  // 消费待传递的数据(目标工具调用)
  consumeTransfer(toolId?: string): string | null {
    if (!pendingTransfer || (toolId && pendingTransfer.toolId !== toolId)) return null;
    const data = pendingTransfer.data;
    pendingTransfer = null;
    return data;
  },

  // 获取当前待消费数据(不消费,只读)
  getPendingTransfer(): PendingTransfer | null {
    return pendingTransfer;
  },

  // 打开工具选择器
  showPicker(data: string) {
    pickerData = data;
    pickerOpen = true;
    notify();
  },

  // 关闭选择器
  closePicker() {
    pickerOpen = false;
    pickerData = null;
    notify();
  },

  getPickerState() {
    return { open: pickerOpen, data: pickerData };
  },

  // 订阅状态变化(用于触发组件重渲染)
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
