"use client";

import React, { useMemo, useState } from "react";
import { Conversation, UserPublic } from "@/lib/api";

type View = "chat" | "memories" | "usage" | "profile" | "health";

type SidebarProps = {
  user: UserPublic;
  currentView: View;
  onSelectView: (view: View) => void;
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  showArchived: boolean;
  onToggleShowArchived: (val: boolean) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onLogout: () => void;
  onOpenUpgrade: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
};

export function Sidebar({
  user,
  currentView,
  onSelectView,
  conversations,
  activeConvId,
  onSelectConversation,
  onCreateConversation,
  showArchived,
  onToggleShowArchived,
  onArchive,
  onUnarchive,
  onDelete,
  onRename,
  onLogout,
  onOpenUpgrade,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleSelectConv = (id: string) => {
    onSelectConversation(id);
    onCloseMobile?.();
  };

  const handleSelectV = (v: View) => {
    onSelectView(v);
    onCloseMobile?.();
  };

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.ai_nickname && c.ai_nickname.toLowerCase().includes(q)),
    );
  }, [conversations, searchQuery]);

  // Group conversations by time (Today, Past 7 days, Older)
  const groupedConversations = useMemo(() => {
    const today: Conversation[] = [];
    const pastWeek: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

    filteredConversations.forEach((conv) => {
      const time = new Date(conv.last_message_at || conv.created_at).getTime();
      if (time >= startOfToday) {
        today.push(conv);
      } else if (time >= sevenDaysAgo) {
        pastWeek.push(conv);
      } else {
        older.push(conv);
      }
    });

    return [
      { label: "Hôm nay", items: today },
      { label: "7 ngày qua", items: pastWeek },
      { label: "Cũ hơn", items: older },
    ].filter((group) => group.items.length > 0);
  }, [filteredConversations]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-950 border-r border-slate-800/90 flex flex-col justify-between shrink-0 text-slate-200 transition-all duration-300 md:translate-x-0 md:static ${
          isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Top Header & Navigation */}
        <div className="p-4 flex flex-col gap-3.5 overflow-hidden">
          {/* App Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 border border-emerald-500/40 flex items-center justify-center text-xl shadow-md glow-emerald-sm">
                🤪
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white leading-tight">
                  Chat Crazy
                </span>
                <span className="text-[10px] text-emerald-400 font-medium tracking-wide">
                  AI ASSISTANT
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {user.is_guest && (
                <button
                  onClick={onOpenUpgrade}
                  className="text-[11px] bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-lg hover:bg-emerald-500/30 transition-all font-semibold active:scale-95"
                >
                  ⚡ Nâng cấp
                </button>
              )}
              {onCloseMobile && (
                <button
                  onClick={onCloseMobile}
                  className="md:hidden text-slate-400 hover:text-white p-1 text-sm font-bold"
                  title="Đóng menu"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* View Switcher Pill Navigation */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80">
            <button
              onClick={() => handleSelectV("chat")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentView === "chat"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => handleSelectV("memories")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentView === "memories"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🧠 Nhớ
            </button>
            <button
              onClick={() => handleSelectV("usage")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentView === "usage"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📊 Dùng
            </button>
            <button
              onClick={() => handleSelectV("health")}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentView === "health"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚙️ Trạng thái
            </button>
          </div>

          {/* Create New Conversation Button */}
          <button
            onClick={() => {
              onCreateConversation();
              onCloseMobile?.();
            }}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:from-emerald-600 active:to-teal-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <span>✨</span> Tạo Cuộc Trò Chuyện Mới
          </button>

          {/* Search Conversations Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cuộc trò chuyện..."
              className="w-full bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 rounded-xl pl-8 pr-7 py-2 outline-none focus:border-emerald-500/60 transition-all"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Archive Toggle Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-800/80">
            <span>{showArchived ? "Hộp lưu trữ" : "Cuộc trò chuyện"}</span>
            <button
              onClick={() => onToggleShowArchived(!showArchived)}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {showArchived ? "Xem hiện tại" : "Xem lưu trữ"}
            </button>
          </div>

          {/* Grouped Conversation List */}
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-340px)] pr-1 custom-scrollbar">
            {filteredConversations.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8 flex flex-col items-center gap-1.5">
                <span className="text-2xl opacity-40">📭</span>
                <span>
                  {searchQuery
                    ? "Không tìm thấy cuộc trò chuyện phù hợp"
                    : showArchived
                    ? "Chưa có cuộc trò chuyện nào bị lưu trữ"
                    : "Chưa có cuộc trò chuyện nào"}
                </span>
              </div>
            ) : (
              groupedConversations.map((group, gIdx) => (
                <div key={gIdx} className="flex flex-col gap-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5">
                    {group.label}
                  </div>

                  {group.items.map((conv) => {
                    const isActive = conv.id === activeConvId;

                    if (editingId === conv.id) {
                      return (
                        <div
                          key={conv.id}
                          className="p-2 bg-slate-900 border border-emerald-500/50 rounded-xl flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(conv.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveRename(conv.id)}
                            className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-400 transition-colors"
                          >
                            Lưu
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConv(conv.id)}
                        className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all relative ${
                          isActive
                            ? "bg-slate-900 text-white font-semibold border border-emerald-500/30 shadow-md shadow-emerald-950/10"
                            : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-400 rounded-r-full"></span>
                        )}

                        <span className="truncate flex-1 pr-2 pl-1.5">{conv.title}</span>

                        {/* Action menu buttons */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(conv);
                            }}
                            className="p-1 hover:text-emerald-400 text-slate-400 text-[11px] rounded hover:bg-slate-800 transition-colors"
                            title="Đổi tên"
                          >
                            ✏️
                          </button>

                          {showArchived ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnarchive(conv.id);
                              }}
                              className="p-1 hover:text-emerald-400 text-slate-400 text-[11px] rounded hover:bg-slate-800 transition-colors"
                              title="Khôi phục"
                            >
                              📤
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchive(conv.id);
                              }}
                              className="p-1 hover:text-amber-400 text-slate-400 text-[11px] rounded hover:bg-slate-800 transition-colors"
                              title="Lưu trữ"
                            >
                              📦
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?")) {
                                onDelete(conv.id);
                              }
                            }}
                            className="p-1 hover:text-rose-400 text-slate-400 text-[11px] rounded hover:bg-slate-800 transition-colors"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom User Info & Logout */}
        <div className="p-4 border-t border-slate-800/90 flex flex-col gap-2.5 bg-slate-950">
          <button
            onClick={() => handleSelectV("profile")}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-900/80 transition-colors text-left w-full group border border-transparent hover:border-slate-800"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition-transform">
              {user.display_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-xs text-white truncate group-hover:text-emerald-400 transition-colors">
                {user.display_name}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {user.is_guest ? "Tài khoản Khách" : user.email}
              </span>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="w-full text-xs text-rose-400 hover:text-rose-300 py-2 rounded-xl hover:bg-rose-500/10 transition-all text-center font-semibold active:scale-[0.99]"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
