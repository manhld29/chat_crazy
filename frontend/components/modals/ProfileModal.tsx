"use client";

import { useState } from "react";
import { UserPublic } from "@/lib/api";

type ProfileModalProps = {
  user: UserPublic;
  isOpen: boolean;
  onClose: () => void;
  onUpgradeGuest: (email: string, pass: string, name: string) => Promise<unknown>;
  authError: string | null;
};

export function ProfileModal({ user, isOpen, onClose, onUpgradeGuest, authError }: ProfileModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onUpgradeGuest(email, password, displayName);
      onClose();
    } catch {
      // Error is set in hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-6 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white">Hồ sơ Cá nhân</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>

        {/* Info summary */}
        <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 font-bold text-lg flex items-center justify-center shadow-lg">
            {user.display_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-white text-sm">{user.display_name}</span>
            <span className="text-xs text-slate-400">{user.is_guest ? "Tài khoản Khách" : user.email}</span>
            <span className="text-[10px] text-emerald-400 mt-0.5">
              {user.is_admin ? "Quản trị viên (Admin)" : "Thành viên"}
            </span>
          </div>
        </div>

        {/* Upgrade guest form if guest */}
        {user.is_guest && (
          <form onSubmit={handleUpgrade} className="flex flex-col gap-4 border-t border-slate-800 pt-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-white">Nâng cấp thành Tài khoản Chính thức</h3>
              <p className="text-xs text-slate-400">
                Nhập Email và Mật khẩu để lưu trữ lịch sử trò chuyện và bộ nhớ vĩnh viễn.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
                {authError}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">Tên hiển thị</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-400">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50 mt-2 shadow-md shadow-emerald-950/20"
            >
              {submitting ? "Đang xử lý..." : "Lưu & Nâng cấp"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
