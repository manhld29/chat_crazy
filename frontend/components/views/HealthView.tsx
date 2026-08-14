"use client";

import { useEffect, useState } from "react";
import { HealthResponse, api } from "@/lib/api";

export function HealthView() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [readyStatus, setReadyStatus] = useState<string>("checking...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.health().catch(() => null),
      api.ready().then((r) => r.status).catch(() => "failed"),
    ]).then(([h, r]) => {
      setHealth(h);
      setReadyStatus(r);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 p-8 flex items-center justify-center text-xs text-slate-500">
        Đang kiểm tra hệ thống...
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto text-slate-200 custom-scrollbar">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-white">Trạng thái Hệ thống (Health Check)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Thông tin chẩn đoán hoạt động của máy chủ backend và cơ sở dữ liệu.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs text-slate-400">Trạng thái API Backend</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {health?.status || "Không xác định"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs text-slate-400">Kết nối Database (PostgreSQL)</span>
            <span
              className={`text-xs font-bold ${
                readyStatus === "ready" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {readyStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[10px] text-slate-500 block">Tên Ứng Dụng</span>
              <span className="text-xs font-medium text-slate-200">{health?.app_name || "N/A"}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Phiên Bản</span>
              <span className="text-xs font-medium text-slate-200">{health?.version || "N/A"}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Môi Trường</span>
              <span className="text-xs font-medium text-slate-200">{health?.environment || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
