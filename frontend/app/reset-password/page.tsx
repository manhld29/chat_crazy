"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PasswordInput } from "@/components/ui/PasswordInput";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Thiếu mã token đặt lại mật khẩu.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.resetPassword({
        token,
        new_password: newPassword,
      });
      setSuccess(res.message);
    } catch (err: any) {
      setError(
        err?.message ||
          "Đặt lại mật khẩu thất bại. Link có thể đã hết hạn (hiệu lực 10 phút) hoặc đã được sử dụng.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full text-center text-white">
        <h1 className="text-xl font-bold text-rose-400 mb-2">Link không hợp lệ</h1>
        <p className="text-xs text-slate-400 mb-6">
          Không tìm thấy token đặt lại mật khẩu. Vui lòng kiểm tra lại liên kết trong email của bạn.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all"
        >
          Trở về Trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl max-w-md w-full text-white shadow-2xl shadow-emerald-950/20">
      <div className="text-center mb-6">
        <h1 className="text-xl font-extrabold text-white">Đặt lại mật khẩu</h1>
        <p className="text-xs text-slate-400 mt-1">
          Tạo mật khẩu mới cho tài khoản của bạn (Link hiệu lực trong 10 phút)
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs text-center font-medium">
          {error}
        </div>
      )}

      {success ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400 text-xl font-bold">
            ✓
          </div>
          <h2 className="text-base font-bold text-white mb-2">Thành công!</h2>
          <p className="text-xs text-slate-300 mb-6">{success}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/30"
          >
            Đăng nhập ngay
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-400">Mật khẩu mới</label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-400">Xác nhận mật khẩu mới</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/30 disabled:opacity-50 mt-2"
          >
            {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu mới"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white text-xs">Đang tải...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
