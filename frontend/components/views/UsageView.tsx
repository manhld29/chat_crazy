"use client";

import { useEffect, useState } from "react";
import { UsageMeResponse, api } from "@/lib/api";

type UsageViewProps = {
  token: string;
};

export function UsageView({ token }: UsageViewProps) {
  const [usage, setUsage] = useState<UsageMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .usage(token)
      .then((res) => setUsage(res))
      .catch(() => setUsage(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 p-8 flex items-center justify-center text-xs text-slate-500">
        Đang tải thông tin hạn ngạch...
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="flex-1 bg-slate-950 p-8 flex items-center justify-center text-xs text-slate-500">
        Không thể tải thông tin hạn ngạch.
      </div>
    );
  }

  const limitPercentage = Math.min(
    100,
    Math.round((usage.messages_used_today / (usage.messages_used_today + usage.messages_remaining_today || 1)) * 100),
  );

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto text-slate-200 custom-scrollbar">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-white">Thống kê Hạn ngạch Sử dụng</h1>
          <p className="text-xs text-slate-400 mt-1">
            Hạn ngạch tin nhắn và số lượng token bạn đã tiêu thụ trong ngày.
          </p>
        </div>

        {/* Quota Overview Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Gói hiện tại</span>
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full">
              {usage.plan}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Tin nhắn hôm nay</span>
              <span className="font-semibold text-white">
                {usage.messages_used_today} / {usage.messages_used_today + usage.messages_remaining_today}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${limitPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 text-right">
              Còn lại: {usage.messages_remaining_today} tin nhắn
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Input Tokens Hôm nay</span>
              <span className="text-base font-bold text-emerald-400">{usage.input_tokens_today.toLocaleString()}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
              <span className="text-[10px] text-slate-400">Output Tokens Hôm nay</span>
              <span className="text-base font-bold text-sky-400">{usage.output_tokens_today.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
