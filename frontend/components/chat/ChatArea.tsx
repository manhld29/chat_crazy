"use client";

import { useEffect, useRef, useState } from "react";
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
  onChangeAiNickname?: (nickname: string) => void;
};

function formatModelName(model: string): string {
  if (!model) return "";
  if (model.includes("llama-3.3-70b-instruct")) return "Llama 3.3 70B (Free)";
  if (model.includes("llama-3.3-70b")) return "Groq Llama 3.3";
  if (model.includes("gemini-2.0")) return "Gemini 2.0 (Free)";
  if (model.includes("deepseek-r1")) return "DeepSeek R1 (Free)";
  if (model.includes("deepseek-chat")) return "DeepSeek V3 (Free)";
  if (model.includes("openrouter/free")) return "OpenRouter Auto Free";
  if (model.includes("gemma-4-31b")) return "Gemma 4 31B (Free)";
  if (model.includes("gemma-4-26b")) return "Gemma 4 26B (Free)";
  if (model.includes("qwen-2.5")) return "Qwen 2.5 (Free)";
  if (model.includes("nemotron")) return "Nemotron 3.5 (Free)";
  if (model.includes("mistral-7b")) return "Mistral 7B (Free)";
  if (model.includes("gpt-oss")) return "GPT OSS (Free)";
  if (model.includes("north-mini")) return "North Mini (Free)";
  if (model.includes("lfm-2.5")) return "LiquidAI (Free)";
  if (model.includes("llama-3.1-8b")) return "Groq Llama 3.1 8B";
  const name = model.split("/").pop()?.replace(":free", "") || model;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function FormattedMessageContent({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 whitespace-pre-wrap break-words">
      {lines.map((line, lineIdx) => {
        const parts: React.ReactNode[] = [];
        const markdownLinkRegex =
          /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)|(https?:\/\/[^\s\)]+)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = markdownLinkRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(line.substring(lastIndex, match.index));
          }

          if (match[1] && match[2]) {
            const linkText = match[1];
            const url = match[2];
            parts.push(
              <a
                key={`${lineIdx}-${match.index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 underline font-medium transition-colors break-all"
              >
                <span>{linkText}</span>
                <span className="text-[10px] opacity-75">↗</span>
              </a>,
            );
          } else if (match[3]) {
            const url = match[3];
            parts.push(
              <a
                key={`${lineIdx}-${match.index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 underline font-medium transition-colors break-all"
              >
                <span>{url}</span>
                <span className="text-[10px] opacity-75">↗</span>
              </a>,
            );
          }

          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
          parts.push(line.substring(lastIndex));
        }

        return <div key={lineIdx}>{parts.length > 0 ? parts : line}</div>;
      })}
    </div>
  );
}

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
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    setIsEditingNickname(false);
  }, [activeConversation?.id]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-950 p-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-4 shadow-xl">
          💬
        </div>
        <p className="text-sm font-medium">Chọn hoặc tạo cuộc trò chuyện mới để bắt đầu</p>
      </div>
    );
  }

  const activePersonalityCode = activeConversation.personality_code || "friendly";

  const backgroundStyles: Record<BackgroundTemplate, string> = {
    mint: "bg-slate-950 text-slate-200",
    sky: "bg-slate-950 text-slate-200",
    sunrise: "bg-slate-950 text-slate-200",
    paper: "bg-slate-950 text-slate-200",
    slate: "bg-slate-950 text-slate-200",
  };

  const aiDisplayName = activeConversation.ai_nickname?.trim() || "AI";

  const handleSaveNickname = () => {
    if (onChangeAiNickname) {
      onChangeAiNickname(tempNickname.trim());
    }
    setIsEditingNickname(false);
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${backgroundStyles[currentBackground]}`}>
      {/* Header Bar */}
      <header className="h-16 px-4 md:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {activeConversation.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {isEditingNickname ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="text"
                    value={tempNickname}
                    onChange={(e) => setTempNickname(e.target.value)}
                    placeholder="Biệt danh AI..."
                    className="bg-slate-950 border border-slate-700 text-xs text-white rounded px-2 py-0.5 outline-none focus:border-emerald-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveNickname();
                      if (e.key === "Escape") setIsEditingNickname(false);
                    }}
                  />
                  <button
                    onClick={handleSaveNickname}
                    className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded hover:bg-emerald-400"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => setIsEditingNickname(false)}
                    className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded hover:bg-slate-700"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-emerald-400 font-medium">🤖 {aiDisplayName}</span>
                  <button
                    onClick={() => {
                      setTempNickname(activeConversation.ai_nickname || "");
                      setIsEditingNickname(true);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline transition-colors"
                    title="Đổi biệt danh cho AI trong cuộc trò chuyện này"
                  >
                    ✏️ Đổi tên AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Personality Switcher */}
          <select
            value={activePersonalityCode}
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
                  className={`min-w-[32px] h-8 px-2 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-md ${
                    isUser
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 text-emerald-400 border border-slate-700"
                  }`}
                  title={isUser ? "Bạn" : aiDisplayName}
                >
                  {isUser
                    ? "Bạn"
                    : aiDisplayName.length > 8
                    ? aiDisplayName.slice(0, 7) + "…"
                    : aiDisplayName}
                </div>

                {/* Content Bubble */}
                <div
                  className={`flex flex-col gap-1 p-3.5 rounded-2xl text-xs leading-relaxed max-w-xl shadow-sm ${
                    isUser
                      ? "bg-emerald-600 text-white rounded-tr-none"
                      : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none"
                  }`}
                >
                  <FormattedMessageContent content={msg.content} />
                  <div className="flex items-center gap-1.5 self-end mt-1 text-[10px] text-slate-400">
                    {!isUser && msg.model && (
                      <span
                        className="px-1.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-emerald-400 font-mono font-medium flex items-center gap-1 shadow-sm"
                        title={`Model: ${msg.model}`}
                      >
                        ⚡ {formatModelName(msg.model)}
                      </span>
                    )}
                    {msg.latency_ms && (
                      <span className="text-slate-400 font-mono">
                        {msg.latency_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isStreaming && (
          <div className="flex gap-2 items-center text-slate-400 text-xs italic py-2">
            <span className="animate-pulse">🤖 {aiDisplayName} đang suy nghĩ...</span>
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
