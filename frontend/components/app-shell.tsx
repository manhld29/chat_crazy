"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { useChatStream } from "@/hooks/useChatStream";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { MemoriesView } from "@/components/views/MemoriesView";
import { UsageView } from "@/components/views/UsageView";
import { HealthView } from "@/components/views/HealthView";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { CreateConversationModal } from "@/components/modals/CreateConversationModal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { api } from "@/lib/api";

type View = "chat" | "memories" | "usage" | "profile" | "health";
type AuthMode = "login" | "register" | "guest" | "forgot";

type AppShellProps = {
  initialView?: View;
  initialConversationId?: string;
  initialAuthMode?: AuthMode;
};

export function AppShell({
  initialView = "chat",
  initialConversationId,
  initialAuthMode = "login",
}: AppShellProps) {
  const { session, authError, loading, login, register, guestLogin, logout, upgradeGuest } = useAuth();

  const [view, setView] = useState<View>(initialView);
  const [authMode, setAuthMode] = useState<AuthMode>(initialAuthMode);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateConvOpen, setIsCreateConvOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Forgot password states
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotError, setForgotError] = useState("");

  const token = session?.accessToken || null;

  const {
    conversations,
    personalities,
    activeConvId,
    setActiveConvId,
    activeConversation,
    showArchived,
    setShowArchived,
    backgrounds,
    setConversationBackground,
    createConversation,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    updateConversation,
  } = useConversations(token, initialConversationId);

  const {
    messages,
    inputContent,
    setInputContent,
    isStreaming,
    streamError,
    sendMessage,
  } = useChatStream(token, activeConvId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Đang khởi động Chat Crazy...
      </div>
    );
  }

  // Auth Screen if not logged in
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl flex flex-col gap-6 text-slate-200">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-lg">
              🤪
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Chat Crazy</h1>
            <p className="text-xs text-slate-400">Trợ lý AI đa tính cách & bộ nhớ thông minh</p>
          </div>

          {/* Auth Tab Switcher */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setAuthMode("login")}
              className={`py-2 text-xs font-medium rounded-lg transition-all ${
                authMode === "login"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`py-2 text-xs font-medium rounded-lg transition-all ${
                authMode === "register"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Đăng ký
            </button>
            <button
              onClick={() => setAuthMode("guest")}
              className={`py-2 text-xs font-medium rounded-lg transition-all ${
                authMode === "guest"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Khách 🚀
            </button>
          </div>

          {authError && authMode !== "forgot" && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs text-center">
              {authError}
            </div>
          )}

          {authMode === "forgot" ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setForgotSubmitting(true);
                setForgotError("");
                setForgotSuccess("");
                try {
                  const res = await api.forgotPassword({ email });
                  setForgotSuccess(res.message);
                } catch (err: any) {
                  setForgotError(err?.message || "Có lỗi xảy ra, vui lòng thử lại.");
                } finally {
                  setForgotSubmitting(false);
                }
              }}
              className="flex flex-col gap-4"
            >
              <div className="text-center text-xs text-slate-400 mb-1">
                Nhập email của bạn để nhận link đặt lại mật khẩu (link có hiệu lực trong 10 phút).
              </div>

              {forgotError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs text-center">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs text-center">
                  {forgotSuccess}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">Email khôi phục</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={forgotSubmitting}
                className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/30 disabled:opacity-50 mt-2"
              >
                {forgotSubmitting ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setForgotError("");
                  setForgotSuccess("");
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors text-center mt-1"
              >
                ← Quay lại Đăng nhập
              </button>
            </form>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (authMode === "login") {
                  await login(email, password);
                } else if (authMode === "register") {
                  await register(email, password, displayName);
                } else {
                  await guestLogin(displayName || "Khách");
                }
              }}
              className="flex flex-col gap-4"
            >
              {authMode !== "login" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-slate-400">Tên hiển thị</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="VD: Anh Sếp"
                    required={authMode === "register"}
                    className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              {authMode !== "guest" && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-400">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@example.com"
                      className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-400">Mật khẩu</label>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50"
                    />
                    {authMode === "login" && (
                      <div className="flex justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("forgot");
                            setForgotError("");
                            setForgotSuccess("");
                          }}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Quên mật khẩu?
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/30 mt-2"
              >
                {authMode === "login"
                  ? "Đăng nhập"
                  : authMode === "register"
                  ? "Tạo tài khoản"
                  : "Bắt đầu ngay không cần tạo TK"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const currentBg = (activeConvId && backgrounds[activeConvId]) || "mint";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Sidebar Component */}
      <Sidebar
        user={session.user}
        currentView={view}
        onSelectView={(v) => {
          if (v === "profile") {
            setIsProfileOpen(true);
          } else {
            setView(v);
          }
        }}
        conversations={conversations}
        activeConvId={activeConvId}
        onSelectConversation={(id) => setActiveConvId(id)}
        onCreateConversation={() => setIsCreateConvOpen(true)}
        showArchived={showArchived}
        onToggleShowArchived={(val) => setShowArchived(val)}
        onArchive={(id) => archiveConversation(id)}
        onUnarchive={(id) => unarchiveConversation(id)}
        onDelete={(id) => deleteConversation(id)}
        onRename={(id, title) => updateConversation(id, { title })}
        onLogout={logout}
        onOpenUpgrade={() => setIsProfileOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {view === "chat" && (
          <ChatArea
            activeConversation={activeConversation}
            personalities={personalities}
            messages={messages}
            inputContent={inputContent}
            setInputContent={setInputContent}
            isStreaming={isStreaming}
            streamError={streamError}
            onSendMessage={sendMessage}
            currentBackground={currentBg}
            onChangeBackground={(bg) => {
              if (activeConvId) setConversationBackground(activeConvId, bg);
            }}
            onChangePersonality={(code) => {
              if (activeConvId) updateConversation(activeConvId, { personality_code: code });
            }}
            onChangeAiNickname={(nickname) => {
              if (activeConvId) updateConversation(activeConvId, { ai_nickname: nickname });
            }}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />
        )}

        {view === "memories" && token && <MemoriesView token={token} />}

        {view === "usage" && token && <UsageView token={token} />}

        {view === "health" && <HealthView />}
      </main>

      {/* Create Conversation Modal */}
      <CreateConversationModal
        isOpen={isCreateConvOpen}
        onClose={() => setIsCreateConvOpen(false)}
        personalities={personalities}
        onCreate={async (code, firstMsg, nickname) => {
          await createConversation(code, firstMsg, nickname);
        }}
      />

      {/* Profile Modal */}
      <ProfileModal
        user={session.user}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpgradeGuest={upgradeGuest}
        authError={authError}
      />
    </div>
  );
}
