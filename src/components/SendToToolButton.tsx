import React from 'react';
import { Icon } from './Icon';
import { useToolBridge } from '../hooks/useToolBridge';

interface SendToToolButtonProps {
  data: string;
  label?: string;
  className?: string;
}

export const SendToToolButton: React.FC<SendToToolButtonProps> = ({
  data,
  label = '发送到其他工具',
  className = '',
}) => {
  const { showPicker } = useToolBridge();

  const handleClick = () => {
    if (!data) return;
    showPicker(data);
  };

  return (
    <button
      onClick={handleClick}
      disabled={!data}
      className={`flex items-center gap-1 font-bold text-[10px] py-1 px-2.5 rounded-md border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-700 border-slate-200 shadow-2xs hover:bg-slate-50 ${className}`}
      title="将当前内容发送到其他工具"
    >
      <Icon name="Share2" size={10} />
      {label}
    </button>
  );
};
