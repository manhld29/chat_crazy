"use client";

import { useState } from "react";
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
}: SidebarProps) {
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

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 text-slate-200">
      {/* Top Header & Navigation */}
      <div className="p-4 flex flex-col gap-4 overflow-hidden">
        {/* App Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              🤪
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">Chat Crazy</span>
          </div>

          {user.is_guest && (
            <button
              onClick={onOpenUpgrade}
              className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full hover:bg-emerald-500/20 transition-colors"
            >
              Nâng cấp
            </button>
          )}
        </div>

        {/* View Switcher Buttons */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <button
            onClick={() => onSelectView("chat")}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
              currentView === "chat"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => onSelectView("memories")}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
              currentView === "memories"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Ghi nhớ
          </button>
          <button
            onClick={() => onSelectView("usage")}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
              currentView === "usage"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Hạn ngạch
          </button>
          <button
            onClick={() => onSelectView("health")}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
              currentView === "health"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Hệ thống
          </button>
        </div>

        {/* New Chat Button */}
        {currentView === "chat" && (
          <button
            onClick={onCreateConversation}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/20"
          >
            <span className="text-lg leading-none">+</span> Cuộc trò chuyện mới
          </button>
        )}

        {/* Conversation List */}
        {currentView === "chat" && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar min-h-0">
            <div className="flex items-center justify-between text-xs text-slate-400 px-2 py-1">
              <span>{showArchived ? "Hội thoại đã lưu trữ" : "Cuộc trò chuyện"}</span>
              <button
                onClick={() => onToggleShowArchived(!showArchived)}
                className="hover:text-emerald-400 text-[11px] underline"
              >
                {showArchived ? "Xem hiện tại" : "Xem lưu trữ"}
              </button>
            </div>

            {conversations.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">Chưa có cuộc trò chuyện nào</div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const isEditing = editingId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      onSelectView("chat");
                      onSelectConversation(conv.id);
                    }}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                      isActive
                        ? "bg-slate-800 text-white font-medium border border-slate-700/80 shadow-sm"
                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveRename(conv.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveRename(conv.id)}
                        className="bg-slate-950 text-white px-2 py-1 rounded border border-emerald-500/50 outline-none w-full text-xs"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate pr-12">{conv.title}</span>
                    )}

                    {/* Action buttons on hover */}
                    {!isEditing && (
                      <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-slate-900/90 px-1 py-0.5 rounded-md border border-slate-800 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(conv);
                          }}
                          className="hover:text-emerald-400 p-0.5"
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
                            className="hover:text-emerald-400 p-0.5"
                            title="Bỏ lưu trữ"
                          >
                            📥
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchive(conv.id);
                            }}
                            className="hover:text-emerald-400 p-0.5"
                            title="Lưu trữ"
                          >
                            📦
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(conv.id);
                          }}
                          className="hover:text-rose-400 p-0.5"
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div
          onClick={() => onSelectView("profile")}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-slate-950 text-xs shadow-md">
            {user.display_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
              {user.display_name}
            </span>
            <span className="text-[10px] text-slate-500">
              {user.is_guest ? "Tài khoản Khách" : user.email}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          title="Đăng xuất"
        >
          🚪
        </button>
      </div>
    </aside>
  );
}
