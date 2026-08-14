"use client";

import { useEffect, useRef } from "react";
import { Conversation, Message, Personality } from "@/lib/api";
import { BackgroundTemplate, backgroundTemplates } from "@/hooks/useConversations";

type ChatAreaProps = {
  activeConversation: Conversation | null;
  personalities: Personality[];
  messages: Message[];
  inputContent: string;
  setInputContent: (val: string) => void;
  isStreaming: boolean;
  streamError: string | null;
  onSendMessage: () => void;
  currentBackground: BackgroundTemplate;
  onChangeBackground: (bg: BackgroundTemplate) => void;
  onChangePersonality: (code: string) => void;
};

export function ChatArea({
  activeConversation,
  personalities,
  messages,
  inputContent,
  setInputContent,
  isStreaming,
  streamError,
  onSendMessage,
  currentBackground,
  onChangeBackground,
  onChangePersonality,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-950 p-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-4 shadow-xl">
          💬
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Chào mừng đến với Chat Crazy</h2>
        <p className="text-xs text-slate-500 max-w-sm text-center">
          Hãy chọn một cuộc trò chuyện từ thanh bên trái hoặc bấm tạo mới để bắt đầu chat với trợ lý AI!
        </p>
      </div>
    );
  }

  const bgClasses: Record<BackgroundTemplate, string> = {
    mint: "bg-slate-950",
    sky: "bg-slate-950",
    sunrise: "bg-slate-950",
    paper: "bg-slate-950",
    slate: "bg-slate-950",
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${bgClasses[currentBackground]}`}>
      {/* Top Header */}
      <header className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-slate-100 text-sm tracking-tight truncate max-w-md">
            {activeConversation.title}
          </h1>
        </div>

        {/* Customization controls */}
        <div className="flex items-center gap-3">
          {/* Personality selector */}
          <select
            value={activeConversation.personality_code}
            onChange={(e) => onChangePersonality(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 transition-colors"
          >
            {personalities.map((p) => (
              <option key={p.code} value={p.code}>
                🎭 {p.name}
              </option>
            ))}
          </select>

          {/* Background Selector */}
          <select
            value={currentBackground}
            onChange={(e) => onChangeBackground(e.target.value as BackgroundTemplate)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 transition-colors"
          >
            {backgroundTemplates.map((bg) => (
              <option key={bg.value} value={bg.value}>
                🎨 Phông: {bg.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Hãy bắt đầu trò chuyện bằng cách nhập tin nhắn bên dưới!
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-md ${
                    isUser
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 text-emerald-400 border border-slate-700"
                  }`}
                >
                  {isUser ? "Bạn" : "AI"}
                </div>

                {/* Content Bubble */}
                <div
                  className={`flex flex-col gap-1 p-3.5 rounded-2xl text-xs leading-relaxed max-w-xl shadow-sm ${
                    isUser
                      ? "bg-emerald-600 text-white rounded-tr-none"
                      : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  {msg.latency_ms && (
                    <span className="text-[10px] text-slate-400 self-end mt-1">
                      {msg.latency_ms}ms
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        {isStreaming && (
          <div className="flex gap-2 items-center text-slate-400 text-xs italic py-2">
            <span className="animate-pulse">🤖 AI đang suy nghĩ...</span>
          </div>
        )}
        {streamError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
            ⚠️ Lỗi stream: {streamError}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Composer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendMessage();
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Nhập nội dung tin nhắn..."
            disabled={isStreaming}
            className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputContent.trim() || isStreaming}
            className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold px-5 py-3 rounded-xl text-xs transition-all disabled:opacity-40 shadow-md shadow-emerald-950/20"
          >
            {isStreaming ? "Đang gửi..." : "Gửi 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}
