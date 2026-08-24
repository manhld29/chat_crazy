"use client";

import { useState } from "react";
import { Personality } from "@/lib/api";

type CreateConversationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  personalities: Personality[];
  onCreate: (personalityCode: string, firstMessage?: string, aiNickname?: string) => Promise<void>;
};

const SUGGESTED_NICKNAMES = [
  "Jarvis 🤖",
  "Em Trợ Lý 💃",
  "Cố Vấn Senior 💼",
  "Xí Muội 🍬",
  "Friday 🦸‍♀️",
];

export function CreateConversationModal({
  isOpen,
  onClose,
  personalities,
  onCreate,
}: CreateConversationModalProps) {
  const [aiNickname, setAiNickname] = useState("");
  const [personalityCode, setPersonalityCode] = useState(
    personalities[0]?.code || "friendly",
  );
  const [firstMessage, setFirstMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onCreate(
        personalityCode,
        firstMessage.trim() || undefined,
        aiNickname.trim() || undefined,
      );
      // Reset form & close
      setAiNickname("");
      setFirstMessage("");
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tạo cuộc trò chuyện. Vui lòng thử lại.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-5 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400">
              ✨
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Tạo cuộc trò chuyện mới
              </h2>
              <p className="text-xs text-slate-400">
                Đặt biệt danh và chọn phong cách cho trợ lý AI của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* AI Nickname Field */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>🏷️ Biệt danh cho AI (tùy chọn)</span>
              <span className="text-[10px] text-slate-500">Mặc định: AI</span>
            </label>
            <input
              type="text"
              value={aiNickname}
              onChange={(e) => setAiNickname(e.target.value)}
              placeholder="VD: Jarvis, Em Trợ Lý, Cố Vấn Senior..."
              maxLength={40}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/60 transition-colors placeholder-slate-600"
            />
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {SUGGESTED_NICKNAMES.map((nickname) => (
                <button
                  key={nickname}
                  type="button"
                  onClick={() => setAiNickname(nickname.replace(/\s[^\s]+$/, ""))}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 transition-all hover:text-emerald-300 active:scale-95"
                >
                  {nickname}
                </button>
              ))}
            </div>
          </div>

          {/* Personality Field */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-300">
              🎭 Tính cách & Phong cách phản hồi
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {personalities.map((p) => {
                const isSelected = personalityCode === p.code;
                return (
                  <div
                    key={p.code}
                    onClick={() => setPersonalityCode(p.code)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/60 text-white shadow-sm"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-2">
                        {p.description}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-emerald-400 font-bold ml-2 text-sm">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional First Message */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300">
              💬 Tin nhắn mở đầu (tùy chọn)
            </label>
            <input
              type="text"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder="VD: Xin chào! Bạn có thể giúp mình công việc hôm nay không?"
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/60 transition-colors placeholder-slate-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-2 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-950/30 disabled:opacity-50"
            >
              {submitting ? "Đang khởi tạo..." : "Bắt đầu trò chuyện 🚀"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
