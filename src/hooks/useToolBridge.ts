import { useState, useEffect } from 'react';
import { toolBridge } from '../contexts/ToolBridgeContext';

// 轻量 hook:订阅 toolBridge 状态变化,触发组件重渲染
export const useToolBridge = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return toolBridge.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    pendingTransfer: toolBridge.getPendingTransfer(),
    sendToTool: toolBridge.sendToTool,
    consumeTransfer: toolBridge.consumeTransfer,
    showPicker: toolBridge.showPicker,
    pickerOpen: toolBridge.getPickerState().open,
    pickerData: toolBridge.getPickerState().data,
    closePicker: toolBridge.closePicker,
  };
};
