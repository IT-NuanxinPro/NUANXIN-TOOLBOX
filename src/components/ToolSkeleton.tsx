import React from 'react';

export const ToolSkeleton: React.FC<{ toolTitle?: string }> = ({ toolTitle }) => {
  return (
    <div className="flex flex-col gap-4">
      {/* 顶部加载提示 */}
      <div className="flex items-center justify-center gap-2.5 py-3 px-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin-slow"></div>
        <span className="text-xs font-bold text-slate-700">
          正在加载{toolTitle ? `「${toolTitle}」` : '工具'}...
        </span>
      </div>

      {/* 骨架屏占位 */}
      <div className="flex flex-col gap-4 animate-pulse">
        {/* 标题区 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-200 rounded-md"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          </div>
        </div>

        {/* 内容区 - 双栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <div className="h-3 bg-slate-200 rounded w-1/6"></div>
              </div>
              <div className="p-5 space-y-3">
                <div className="h-3 bg-slate-100 rounded w-full"></div>
                <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                <div className="h-3 bg-slate-100 rounded w-4/6"></div>
                <div className="h-3 bg-slate-100 rounded w-full"></div>
                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <div className="h-3 bg-slate-200 rounded w-1/5"></div>
              </div>
              <div className="p-5 space-y-3">
                <div className="h-3 bg-slate-100 rounded w-full"></div>
                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                <div className="h-3 bg-slate-100 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
