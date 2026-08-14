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

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 text-slate-200 transition-transform duration-300 md:translate-x-0 md:static ${
          isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
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

            <div className="flex items-center gap-1.5">
              {user.is_guest && (
                <button
                  onClick={onOpenUpgrade}
                  className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full hover:bg-emerald-500/20 transition-colors"
                >
                  Nâng cấp
                </button>
              )}
              {onCloseMobile && (
                <button
                  onClick={onCloseMobile}
                  className="md:hidden text-slate-400 hover:text-white p-1 text-base font-bold"
                  title="Đóng menu"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* View Switcher Buttons */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <button
              onClick={() => handleSelectV("chat")}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                currentView === "chat"
                  ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => handleSelectV("memories")}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                currentView === "memories"
                  ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🧠 Nhớ
            </button>
            <button
              onClick={() => handleSelectV("usage")}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                currentView === "usage"
                  ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📊 Dùng
            </button>
            <button
              onClick={() => handleSelectV("health")}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                currentView === "health"
                  ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
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
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2"
          >
            <span>✨</span> Tạo Cuộc Trò Chuyện Mới
          </button>

          {/* Archive Toggle */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-2 border-t border-slate-800">
            <span>{showArchived ? "Đang lưu trữ" : "Cuộc trò chuyện"}</span>
            <button
              onClick={() => onToggleShowArchived(!showArchived)}
              className="text-[11px] text-emerald-400 hover:underline"
            >
              {showArchived ? "Xem hiện tại" : "Xem lưu trữ"}
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 custom-scrollbar">
            {conversations.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                {showArchived ? "Chưa có cuộc trò chuyện nào bị lưu trữ" : "Chưa có cuộc trò chuyện nào"}
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;

                if (editingId === conv.id) {
                  return (
                    <div key={conv.id} className="p-2 bg-slate-800 rounded-xl flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(conv.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveRename(conv.id)}
                        className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded"
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
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                      isActive
                        ? "bg-slate-800 text-white font-medium border border-slate-700"
                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <span className="truncate flex-1 pr-2">{conv.title}</span>

                    {/* Action menu */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(conv);
                        }}
                        className="p-1 hover:text-emerald-400 text-slate-400 text-[10px]"
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
                          className="p-1 hover:text-emerald-400 text-slate-400 text-[10px]"
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
                          className="p-1 hover:text-amber-400 text-slate-400 text-[10px]"
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
                        className="p-1 hover:text-rose-400 text-slate-400 text-[10px]"
                        title="Xóa"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom User Info & Profile */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
          <button
            onClick={() => handleSelectV("profile")}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-left w-full"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0">
              {user.display_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium text-xs text-white truncate">{user.display_name}</span>
              <span className="text-[10px] text-slate-400 truncate">
                {user.is_guest ? "Tài khoản Khách" : user.email}
              </span>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="w-full text-xs text-rose-400 hover:text-rose-300 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors text-center font-medium"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
