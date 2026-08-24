"use client";

import React, { useEffect, useRef, useState } from "react";
import { Conversation, Message, Personality } from "@/lib/api";
import { BackgroundTemplate, backgroundTemplates } from "@/hooks/useConversations";
import { MarkdownRenderer } from "./MarkdownRenderer";

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
  onChangeAiNickname?: (nickname: string) => void;
  onOpenMobileSidebar?: () => void;
};

function formatModelName(model: string): string {
  if (!model) return "";
  if (model.includes("llama-3.3-70b-instruct")) return "Llama 3.3 70B (Free)";
  if (model.includes("llama-3.3-70b")) return "Groq Llama 3.3";
  if (model.includes("gemini-2.0")) return "Gemini 2.0 (Free)";
  if (model.includes("deepseek-r1")) return "DeepSeek R1 (Free)";
  if (model.includes("deepseek-chat")) return "DeepSeek V3 (Free)";
  if (model.includes("openrouter/free")) return "OpenRouter Auto";
  if (model.includes("gemma-4-31b")) return "Gemma 4 31B";
  if (model.includes("gemma-4-26b")) return "Gemma 4 26B";
  if (model.includes("qwen-2.5")) return "Qwen 2.5";
  if (model.includes("nemotron")) return "Nemotron 3.5";
  if (model.includes("mistral-7b")) return "Mistral 7B";
  if (model.includes("gpt-oss")) return "GPT OSS";
  if (model.includes("llama-3.1-8b")) return "Groq Llama 3.1 8B";
  const name = model.split("/").pop()?.replace(":free", "") || model;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const STARTER_PROMPTS = [
  {
    icon: "🧠",
    title: "Giải thích thuật toán",
    desc: "Giải thích chi tiết thuật toán Dijkstra và trường hợp sử dụng",
    prompt: "Giải thích chi tiết nguyên lý hoạt động của thuật toán Dijkstra và cho ví dụ minh họa bằng code TypeScript.",
  },
  {
    icon: "💻",
    title: "Viết mã TypeScript",
    desc: "Viết custom hook quản lý state & caching trong React",
    prompt: "Viết một custom hook useLocalStorage trong React với TypeScript, hỗ trợ type-safe và xử lý đồng bộ giữa các tabs.",
  },
  {
    icon: "💡",
    title: "Lên ý tưởng sáng tạo",
    desc: "Gợi ý 5 ý tưởng ứng dụng AI thực tế giải quyết vấn đề đời sống",
    prompt: "Gợi ý cho tôi 5 ý tưởng phát triển ứng dụng AI thực tiễn nhất hiện nay kèm phân tích tính khả thi.",
  },
  {
    icon: "📝",
    title: "Tóm tắt & Phân tích",
    desc: "Tóm tắt các nguyên tắc thiết kế Clean Architecture",
    prompt: "Tóm tắt các nguyên tắc cốt lõi của Clean Architecture và cách áp dụng vào dự án fullstack Node.js.",
  },
];

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
  onChangeAiNickname,
  onOpenMobileSidebar,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const isEditingNickname = Boolean(activeConversation?.id && editingConvId === activeConversation.id);
  const [tempNickname, setTempNickname] = useState("");
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, "like" | "dislike">>({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputContent]);

  // Handle scroll detection for scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopyMessage = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  const handleFeedback = (id: string, type: "like" | "dislike") => {
    setFeedback((prev) => ({
      ...prev,
      [id]: prev[id] === type ? undefined! : type,
    }));
  };

  const handleSaveNickname = () => {
    if (onChangeAiNickname) {
      onChangeAiNickname(tempNickname.trim());
    }
    setEditingConvId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputContent.trim() && !isStreaming) {
        onSendMessage();
      }
    }
  };

  const handleSelectStarter = (promptText: string) => {
    setInputContent(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const backgroundThemeClasses: Record<BackgroundTemplate, string> = {
    mint: "chat-theme-mint",
    sky: "chat-theme-sky",
    sunrise: "chat-theme-sunrise",
    paper: "chat-theme-paper",
    slate: "chat-theme-slate",
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-950 p-6 text-center relative">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden absolute top-4 left-4 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-xs shadow-lg"
          >
            ☰ Danh sách
          </button>
        )}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl mb-5 shadow-2xl glow-emerald-sm">
          💬
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Chào mừng bạn đến với Chat Crazy</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Chọn một cuộc trò chuyện từ danh sách hoặc tạo một cuộc trò chuyện mới để bắt đầu khám phá trí tuệ nhân tạo.
        </p>
      </div>
    );
  }

  const activePersonality = personalities.find(
    (p) => p.code === (activeConversation.personality_code || "friendly"),
  );
  const activePersonalityCode = activeConversation.personality_code || "friendly";
  const aiDisplayName = activeConversation.ai_nickname?.trim() || "Trợ lý AI";

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden transition-colors duration-300 relative ${
        backgroundThemeClasses[currentBackground] || "chat-theme-mint"
      }`}
    >
      {/* Header Bar */}
      <header className="h-16 px-4 md:px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/75 backdrop-blur-xl shrink-0 z-10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="md:hidden p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:bg-slate-700 transition-all text-xs font-bold shrink-0 active:scale-95"
              title="Mở danh sách hội thoại"
            >
              ☰
            </button>
          )}

          {/* Title & Nickname */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <h2 className="text-xs md:text-sm font-bold text-white tracking-tight truncate max-w-[180px] md:max-w-md">
                {activeConversation.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              {isEditingNickname ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempNickname}
                    onChange={(e) => setTempNickname(e.target.value)}
                    placeholder="Biệt danh AI..."
                    className="bg-slate-900 border border-emerald-500/60 text-xs text-white rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-emerald-500 w-28 md:w-36"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNickname();
                      if (e.key === "Escape") setEditingConvId(null);
                    }}
                  />
                  <button
                    onClick={handleSaveNickname}
                    className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded hover:bg-emerald-400 transition-colors"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => setEditingConvId(null)}
                    className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded hover:bg-slate-700 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span>🤖</span> {aiDisplayName}
                  </span>
                  <button
                    onClick={() => {
                      setTempNickname(activeConversation.ai_nickname || "");
                      setEditingConvId(activeConversation.id);
                    }}
                    className="text-[10px] text-slate-500 hover:text-emerald-300 transition-colors"
                    title="Đổi biệt danh cho AI"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Personality Switcher */}
          <div className="relative">
            <select
              value={activePersonalityCode}
              onChange={(e) => onChangePersonality(e.target.value)}
              className="appearance-none bg-slate-900/90 border border-slate-700/80 text-[11px] md:text-xs text-slate-200 font-medium rounded-xl pl-3 pr-7 py-1.5 outline-none hover:border-slate-600 focus:border-emerald-500/80 transition-all cursor-pointer shadow-sm"
              title={activePersonality?.description || "Chọn tính cách AI"}
            >
              {personalities.map((p) => (
                <option key={p.code} value={p.code} className="bg-slate-900 text-slate-200 py-1">
                  🎭 {p.name}
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none">
              ▼
            </span>
          </div>

          {/* Background Theme Selector */}
          <div className="relative">
            <select
              value={currentBackground}
              onChange={(e) => onChangeBackground(e.target.value as BackgroundTemplate)}
              className="appearance-none bg-slate-900/90 border border-slate-700/80 text-[11px] md:text-xs text-slate-200 font-medium rounded-xl pl-3 pr-7 py-1.5 outline-none hover:border-slate-600 focus:border-emerald-500/80 transition-all cursor-pointer shadow-sm"
              title="Chọn hình nền trò chuyện"
            >
              {backgroundTemplates.map((bg) => (
                <option key={bg.value} value={bg.value} className="bg-slate-900 text-slate-200 py-1">
                  🎨 {bg.label}
                </option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none">
              ▼
            </span>
          </div>
        </div>
      </header>

      {/* Message List Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 custom-scrollbar scroll-smooth"
      >
        {messages.length === 0 ? (
          /* Empty State Hero Banner */
          <div className="flex-1 flex flex-col items-center justify-center my-auto py-8 max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/30 border border-emerald-500/40 flex items-center justify-center text-3xl mb-4 shadow-xl glow-emerald">
              ✨
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight mb-2">
              Xin chào! Tôi là <span className="text-emerald-400">{aiDisplayName}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-8 max-w-md leading-relaxed">
              {activePersonality?.description ||
                "Trợ lý AI thông minh sẵn sàng lắng nghe, suy nghĩ và giải đáp mọi câu hỏi của bạn."}
            </p>

            <div className="w-full text-left">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Bắt đầu bằng một gợi ý:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectStarter(item.prompt)}
                    className="group p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-emerald-500/40 transition-all text-left flex items-start gap-3 shadow-md hover:shadow-emerald-950/20 active:scale-[0.99]"
                  >
                    <span className="text-xl p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Render Message Bubbles */
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const isMsgCopied = copiedMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`group flex gap-3 max-w-[95%] md:max-w-3xl ${
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-md transition-transform group-hover:scale-105 ${
                    isUser
                      ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-extrabold"
                      : "bg-slate-900 text-emerald-400 border border-slate-700/80 glow-emerald-sm"
                  }`}
                  title={isUser ? "Bạn" : aiDisplayName}
                >
                  {isUser ? "Bạn" : "AI"}
                </div>

                {/* Bubble Body */}
                <div className="flex flex-col gap-1.5 max-w-[calc(100%-44px)]">
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed shadow-lg relative ${
                      isUser
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-emerald-950/20"
                        : "glass-panel text-slate-100 rounded-tl-sm border border-slate-800/90 shadow-2xl"
                    }`}
                  >
                    <MarkdownRenderer content={msg.content} />
                  </div>

                  {/* Metadata & Actions Toolbar */}
                  <div
                    className={`flex items-center gap-2 text-[10px] text-slate-400 px-1 ${
                      isUser ? "justify-end" : "justify-between"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5">
                        {msg.model && (
                          <span
                            className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-800 text-emerald-400 font-mono font-medium flex items-center gap-1 shadow-sm"
                            title={`Model: ${msg.model}`}
                          >
                            ⚡ {formatModelName(msg.model)}
                          </span>
                        )}
                        {msg.latency_ms && (
                          <span className="font-mono text-slate-500">
                            {msg.latency_ms}ms
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action buttons (Copy, Feedback) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="px-1.5 py-0.5 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Sao chép toàn bộ tin nhắn"
                      >
                        {isMsgCopied ? "✓ Đã chép" : "📋 Sao chép"}
                      </button>

                      {!isUser && (
                        <>
                          <button
                            onClick={() => handleFeedback(msg.id, "like")}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                              feedback[msg.id] === "like" ? "text-emerald-400" : "text-slate-500"
                            }`}
                            title="Phản hồi tốt"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, "dislike")}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                              feedback[msg.id] === "dislike" ? "text-rose-400" : "text-slate-500"
                            }`}
                            title="Phản hồi chưa tốt"
                          >
                            👎
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Streaming Thinking State */}
        {isStreaming && (
          <div className="flex gap-3 items-center text-slate-300 text-xs py-2 max-w-3xl mr-auto animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-400 text-xs shadow-md glow-emerald-sm animate-pulse">
              🤖
            </div>
            <div className="flex items-center gap-2 p-3 rounded-2xl glass-panel text-slate-300 text-xs border border-slate-800/80">
              <span className="font-medium">
                {aiDisplayName} đang suy nghĩ
              </span>
              <div className="flex items-center gap-1 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-1"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-2"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-3"></span>
              </div>
            </div>
          </div>
        )}

        {/* Stream Error Banner */}
        {streamError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-center justify-between shadow-lg">
            <span className="flex items-center gap-2">
              <span>⚠️</span>
              <span>Lỗi phản hồi: {streamError}</span>
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Floating Scroll To Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 right-6 z-20 p-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-slate-700 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 active:scale-95"
          title="Cuộn xuống tin nhắn mới nhất"
        >
          ↓
        </button>
      )}

      {/* Input Composer Section */}
      <div className="p-3 md:p-5 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Main Input Box */}
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/70 focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all shadow-xl">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập nội dung tin nhắn... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)"
              disabled={isStreaming}
              className="w-full bg-transparent text-xs md:text-sm text-white placeholder-slate-500 px-4 py-3.5 outline-none resize-none disabled:opacity-50 min-h-[48px] max-h-[180px] custom-scrollbar leading-relaxed"
            />

            {/* Composer Footer toolbar */}
            <div className="flex items-center justify-between px-3.5 pb-2.5 pt-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]">
                  {inputContent.length > 0 && `${inputContent.length} ký tự`}
                </span>
                {inputContent.length > 0 && (
                  <button
                    onClick={() => setInputContent("")}
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSendMessage}
                  disabled={!inputContent.trim() || isStreaming}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:from-emerald-600 active:to-teal-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-30 disabled:pointer-events-none shadow-md shadow-emerald-950/30 active:scale-95"
                >
                  {isStreaming ? (
                    <>
                      <span className="animate-spin text-[10px]">⏳</span>
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <span>Gửi</span>
                      <span>🚀</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
