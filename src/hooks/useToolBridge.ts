import { useCallback, useEffect, useState } from 'react';
import { toolBridge } from '../contexts/ToolBridgeContext';

// 轻量 hook:订阅 toolBridge 状态变化,触发组件重渲染
export const useToolBridge = (toolId?: string) => {
  const [, setTick] = useState(0);
  const pendingTransfer = toolBridge.getPendingTransfer();
  const matchingTransfer = !toolId || pendingTransfer?.toolId === toolId ? pendingTransfer : null;
  const consumeTransfer = useCallback(() => toolBridge.consumeTransfer(toolId), [toolId]);

  useEffect(() => {
    return toolBridge.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    pendingTransfer: matchingTransfer,
    sendToTool: toolBridge.sendToTool,
    consumeTransfer,
    showPicker: toolBridge.showPicker,
    pickerOpen: toolBridge.getPickerState().open,
    pickerData: toolBridge.getPickerState().data,
    closePicker: toolBridge.closePicker,
  };
};
