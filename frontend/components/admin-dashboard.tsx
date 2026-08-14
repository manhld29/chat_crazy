"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";

import {
  AdminAccountUsage,
  AdminConfigResponse,
  AdminDashboardResponse,
  AdminModelConfigResponse,
  ApiError,
  api,
} from "@/lib/api";
import { PasswordInput } from "@/components/ui/PasswordInput";

const ADMIN_ACCESS_TOKEN_KEY = "chat_crazy_admin_access_token";

function subscribeAdminToken() {
  return () => {};
}

function getAdminTokenSnapshot() {
  return sessionStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) ?? "";
}

function getAdminTokenServerSnapshot() {
  return "";
}

export function AdminLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await api.adminLogin({ identifier, password });
      sessionStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, response.access_token);
      router.push("/admin");
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Đăng nhập admin thất bại",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center text-2xl font-black shadow-lg shadow-emerald-500/20">
            ⚡
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-2">ChatCrazy Admin Pro</h1>
          <p className="text-xs text-slate-400">Đăng nhập vào Bảng điều khiển Quản trị Hệ thống</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-medium flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Email hoặc Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="admin@example.com"
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">Mật khẩu Quản trị</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:opacity-90 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {submitting ? "Đang xác thực..." : "Đăng Nhập Quản Trị 🚀"}
          </button>
        </form>
      </div>
    </main>
  );
}

type ActiveNav = "overview" | "model_config" | "users" | "admins" | "system";

export function AdminDashboard() {
  const router = useRouter();
  const storedAdminToken = useSyncExternalStore(
    subscribeAdminToken,
    getAdminTokenSnapshot,
    getAdminTokenServerSnapshot,
  );

  const [activeNav, setActiveNav] = useState<ActiveNav>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [config, setConfig] = useState<AdminConfigResponse | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [accounts, setAccounts] = useState<AdminAccountUsage[]>([]);
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});
  const [modelConfig, setModelConfig] = useState<AdminModelConfigResponse | null>(null);
  const [manualModeDraft, setManualModeDraft] = useState(false);
  const [selectedModelDraft, setSelectedModelDraft] = useState("");
  const [saveModelSuccess, setSaveModelSuccess] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Create Admin Modal state
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminDisplayName, setNewAdminDisplayName] = useState("");

  const loadData = async (isSilent = false) => {
    if (!storedAdminToken) return;
    if (!isSilent) {
      setLoading(true);
      setError("");
      setSaveModelSuccess("");
    }
    try {
      const token = storedAdminToken;
      const [nextConfig, nextDashboard, nextAccounts, nextModelConfig] = await Promise.all([
        api.adminConfig(token),
        api.adminDashboard(token),
        api.adminAccounts(token),
        api.adminModelConfig(token),
      ]);
      setConfig(nextConfig);
      setDashboard(nextDashboard);
      setAccounts(nextAccounts.items);
      setModelConfig(nextModelConfig);

      if (!isSilent) {
        setManualModeDraft(nextModelConfig.manual_mode);
        setSelectedModelDraft(nextModelConfig.selected_model);
      }

      setLimitDrafts((current) => {
        const newDrafts = { ...current };
        for (const account of nextAccounts.items) {
          if (newDrafts[account.user_id] === undefined) {
            newDrafts[account.user_id] = account.daily_message_limit?.toString() ?? "";
          }
        }
        return newDrafts;
      });
    } catch (unknownError) {
      if (!isSilent) {
        setError(
          unknownError instanceof ApiError || unknownError instanceof Error
            ? unknownError.message
            : "Không tải được dữ liệu admin",
        );
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!storedAdminToken) {
      router.replace("/admin/login");
      return;
    }

    void loadData(false);

    const interval = setInterval(() => {
      void loadData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [storedAdminToken, router]);

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
    router.replace("/admin/login");
  };

  async function saveUserLimit(userId: string) {
    setLoading(true);
    setError("");
    setActionSuccess("");
    try {
      const rawValue = limitDrafts[userId]?.trim() ?? "";
      const nextLimit = rawValue === "" ? null : Number(rawValue);
      if (nextLimit !== null && !Number.isFinite(nextLimit)) {
        throw new Error("Hạn mức không hợp lệ");
      }
      await api.updateAdminUserLimit(storedAdminToken, userId, nextLimit);
      setActionSuccess("Đã cập nhật hạn mức người dùng!");
      await loadData(true);
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Không lưu được hạn mức user",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(userId: string, currentActive: boolean) {
    setLoading(true);
    setError("");
    setActionSuccess("");
    try {
      const res = await api.updateAdminUserStatus(storedAdminToken, userId, !currentActive);
      setAccounts(res.items);
      setActionSuccess(`Đã ${!currentActive ? "kích hoạt" : "khóa"} tài khoản thành công!`);
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Không đổi được trạng thái tài khoản",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRole(userId: string, currentIsAdmin: boolean) {
    setLoading(true);
    setError("");
    setActionSuccess("");
    try {
      const res = await api.updateAdminUserRole(storedAdminToken, userId, !currentIsAdmin);
      setAccounts(res.items);
      setActionSuccess(
        `Đã ${!currentIsAdmin ? "nâng cấp thành Admin" : "gỡ quyền Admin"} thành công!`,
      );
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Không đổi được quyền Admin",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId: string, displayName: string) {
    if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${displayName}" không?`)) {
      return;
    }
    setLoading(true);
    setError("");
    setActionSuccess("");
    try {
      const res = await api.deleteAdminUserAccount(storedAdminToken, userId);
      setAccounts(res.items);
      setActionSuccess(`Đã xóa tài khoản "${displayName}" thành công!`);
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Không xóa được tài khoản",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAdmin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setActionSuccess("");
    try {
      const res = await api.createAdminAccount(storedAdminToken, {
        email: newAdminEmail.trim(),
        username: newAdminUsername.trim(),
        password: newAdminPassword,
        display_name: newAdminDisplayName.trim() || newAdminUsername.trim(),
      });
      setAccounts(res.items);
      setShowCreateAdminModal(false);
      setNewAdminEmail("");
      setNewAdminUsername("");
      setNewAdminPassword("");
      setNewAdminDisplayName("");
      setActionSuccess("Đã tạo tài khoản Admin mới thành công!");
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Không tạo được tài khoản Admin mới",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveModelConfig() {
    setLoading(true);
    setError("");
    setSaveModelSuccess("");
    try {
      const updated = await api.updateAdminModelConfig(
        storedAdminToken,
        manualModeDraft,
        selectedModelDraft,
      );
      setModelConfig(updated);
      setSaveModelSuccess("Đã cập nhật cấu hình Model AI thành công!");
      await loadData(true);
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Không lưu được cấu hình Model AI",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!storedAdminToken) {
    return (
      <main className="min-h-dvh bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center">
          <p className="text-xs text-slate-400 animate-pulse">Đang tải cấu hình phiên làm việc...</p>
        </div>
      </main>
    );
  }

  const regularUsers = accounts.filter(
    (a) =>
      !a.is_admin &&
      (userSearchQuery
        ? (a.display_name && a.display_name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
          (a.email && a.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
          (a.username && a.username.toLowerCase().includes(userSearchQuery.toLowerCase()))
        : true),
  );

  const adminUsers = accounts.filter((a) => a.is_admin);

  const handleSelectNav = (nav: ActiveNav) => {
    setActiveNav(nav);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION MENU */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/95 border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 md:static md:w-64 ${
          isMobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Brand logo */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-500/20">
                ⚡
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm text-white tracking-tight">ChatCrazy</span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">ADMIN CONTROL</span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1 text-base font-bold"
            >
              ✕
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            <NavItem
              icon="📊"
              label="Tổng Quan & Visuals"
              active={activeNav === "overview"}
              onClick={() => handleSelectNav("overview")}
            />
            <NavItem
              icon="🤖"
              label="Cấu Hình Model AI"
              active={activeNav === "model_config"}
              onClick={() => handleSelectNav("model_config")}
              badge={modelConfig?.manual_mode ? "Thủ công" : "Auto Free"}
            />
            <NavItem
              icon="👤"
              label="Quản Lý Người Dùng"
              active={activeNav === "users"}
              onClick={() => handleSelectNav("users")}
              count={accounts.filter((a) => !a.is_admin).length}
            />
            <NavItem
              icon="👑"
              label="Quản Lý Admin"
              active={activeNav === "admins"}
              onClick={() => handleSelectNav("admins")}
              count={adminUsers.length}
              highlight
            />
            <NavItem
              icon="⚙️"
              label="Hệ Thống & Metric"
              active={activeNav === "system"}
              onClick={() => handleSelectNav("system")}
            />
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center">
              AD
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-white truncate">Super Admin</span>
              <span className="text-[10px] text-slate-400 truncate">Phiên làm việc an toàn</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            🚪 Đăng Xuất Admin
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        {/* TOP BAR HEADER */}
        <header className="h-16 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors text-xs font-bold shrink-0"
              title="Mở menu admin"
            >
              ☰ Menu
            </button>

            <h1 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
              {activeNav === "overview" && "📊 Tổng Quan & Chỉ Số Hệ Thống"}
              {activeNav === "model_config" && "🤖 Cấu Hình Model AI"}
              {activeNav === "users" && "👤 Quản Lý Người Dùng"}
              {activeNav === "admins" && "👑 Quản Lý Admin"}
              {activeNav === "system" && "⚙️ Cấu Hình & Metric"}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <span className="text-[10px] md:text-[11px] font-medium px-2.5 md:px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">Auto Sync (10s)</span>
            </span>

            <button
              onClick={() => void loadData(false)}
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold px-2.5 md:px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? "..." : "🔄 Làm mới"}
            </button>
          </div>
        </header>

        {/* WORKSPACE VIEW AREA */}
        <main className="p-3 sm:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
              ⚠️ Lỗi: {error}
            </div>
          )}

          {actionSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
              ✅ {actionSuccess}
            </div>
          )}

          {/* VIEW 1: OVERVIEW DASHBOARD & VISUAL CHARTS */}
          {activeNav === "overview" && dashboard && (
            <div className="flex flex-col gap-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
                <MetricCard label="Tổng tài khoản" value={dashboard.total_users} icon="👥" color="emerald" />
                <MetricCard label="Đã đăng ký" value={dashboard.registered_users} icon="✨" color="teal" />
                <MetricCard label="Khách" value={dashboard.guest_users} icon="👤" color="slate" />
                <MetricCard label="Hội thoại" value={dashboard.conversations} icon="💬" color="cyan" />
                <MetricCard label="Tin hôm nay" value={dashboard.messages_today} icon="⚡" color="amber" />
                <MetricCard label="Input Tokens" value={dashboard.input_tokens_today} icon="📥" color="indigo" />
                <MetricCard label="Output Tokens" value={dashboard.output_tokens_today} icon="📤" color="purple" />
                <MetricCard label="Request lỗi" value={dashboard.failed_requests_today} icon="⚠️" color="rose" />
              </div>

              {/* Visual Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Token Usage Bar Visualization */}
                <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between backdrop-blur-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        📈 Biểu đồ Token Usage Hôm nay
                      </h3>
                      <p className="text-xs text-slate-400">So sánh tỷ lệ Token Nạp vào (Input) và Token Sinh ra (Output)</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                      {(dashboard.input_tokens_today + dashboard.output_tokens_today).toLocaleString()} Total Tokens
                    </span>
                  </div>

                  <TokenBarChart
                    inputTokens={dashboard.input_tokens_today}
                    outputTokens={dashboard.output_tokens_today}
                  />
                </div>

                {/* Chart 2: User Distribution Donut Visualization */}
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      🍩 Cơ Cấu Tài Khoản
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">{dashboard.total_users} Users</span>
                  </div>

                  <UserDistributionDonut
                    registered={dashboard.registered_users}
                    guests={dashboard.guest_users}
                    admins={adminUsers.length}
                  />
                </div>
              </div>

              {/* Quick Model Summary Card */}
              {modelConfig && (
                <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl font-bold shrink-0">
                      🤖
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-slate-400 font-medium">Model AI Đang Hoạt Động Trên Hệ Thống</span>
                      <span className="text-xs sm:text-base font-black text-white font-mono flex items-center gap-2 mt-0.5 truncate">
                        ⚡ {modelConfig.active_model}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectNav("model_config")}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-950/20 shrink-0 w-full sm:w-auto text-center"
                  >
                    Thay Đổi Cấu Hình Model ⚙️
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: MODEL CONFIGURATION */}
          {activeNav === "model_config" && modelConfig && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col gap-6">
              <div className="flex flex-col gap-1 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  🤖 Cấu Hình Model AI Hệ Thống
                </h2>
                <p className="text-xs text-slate-400">
                  Admin có thể bật tùy chọn <strong>Thủ công (Manual Model Setting)</strong> để cố định model, hoặc giữ <strong>Tự động (Free Pool Failover)</strong> để hệ thống tự luân chuyển model tốt nhất khi bận.
                </p>
              </div>

              {saveModelSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  ✅ {saveModelSuccess}
                </div>
              )}

              <div className="flex flex-col gap-6">
                {/* Manual Setting Switch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 gap-4">
                  <div className="flex flex-col gap-1">
                    {/* Explicit Black Label text as requested by user */}
                    <span className="text-sm font-bold text-slate-900 bg-white px-3 py-1 rounded-lg shadow-sm inline-block self-start">
                      Bật Cấu hình Thủ công (Manual Model Setting)
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Khi bật, hệ thống sẽ cố định chạy Model bạn chọn bên dưới thay vì tự động chọn model free.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={manualModeDraft}
                    onChange={(e) => setManualModeDraft(e.target.checked)}
                    className="w-6 h-6 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                </div>

                {/* Model Selector Box */}
                {manualModeDraft ? (
                  <div className="flex flex-col gap-3 p-4 sm:p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                    <label className="text-xs text-slate-300 font-bold">Chọn Model Cố Định Từ Danh Sách:</label>
                    <select
                      value={selectedModelDraft}
                      onChange={(e) => setSelectedModelDraft(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-mono w-full"
                    >
                      {modelConfig.available_models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id})
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-amber-400 font-medium mt-1">
                      ⚠️ Hệ thống sẽ luôn ưu tiên chạy Model <strong>{selectedModelDraft}</strong> này cho tất cả người dùng.
                    </span>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 leading-relaxed">
                    ✨ <strong>Đang Ở Chế Độ Tự Động (Free Model Failover Pool):</strong> Hệ thống tự chọn và luân chuyển giữa 15 model miễn phí chất lượng cao (OpenRouter Auto Free, Meta Llama 3.3 70B, Google Gemini 2.0 Flash, DeepSeek V3, DeepSeek R1, Gemma 4...). Nếu 1 model bận, hệ thống sẽ tự nhảy sang model khác ngay lập tức.
                  </div>
                )}

                <button
                  type="button"
                  onClick={saveModelConfig}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-xs transition-all self-start shadow-lg shadow-emerald-950/20 disabled:opacity-50 w-full sm:w-auto text-center"
                >
                  {loading ? "Đang lưu cấu hình..." : "Lưu Cấu Hình Model 🚀"}
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: REGULAR USER MANAGEMENT */}
          {activeNav === "users" && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    👤 Quản Lý Người Dùng Phổ Thông ({regularUsers.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Danh sách các tài khoản khách và tài khoản đã đăng ký (Đã lọc bỏ Admin).</p>
                </div>

                <input
                  type="text"
                  placeholder="🔍 Tìm theo Tên, Email hoặc Username..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 w-full sm:w-80"
                />
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-[850px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                      <th className="p-3">Người dùng</th>
                      <th className="p-3">Loại</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Hội thoại</th>
                      <th className="p-3">Tin hôm nay</th>
                      <th className="p-3">Giới hạn tin/ngày</th>
                      <th className="p-3">In/Out Tokens</th>
                      <th className="p-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-xs text-slate-500">
                          Không tìm thấy người dùng nào phù hợp với tìm kiếm.
                        </td>
                      </tr>
                    ) : (
                      regularUsers.map((account) => (
                        <tr className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors" key={account.user_id}>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                                {account.display_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-white text-xs truncate">{account.display_name}</span>
                                <span className="text-[11px] text-slate-400 truncate">{account.email ?? (account.username ? `@${account.username}` : "Tài khoản Khách")}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${account.is_guest ? "bg-slate-800 text-slate-400" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                              {account.is_guest ? "Khách" : "Đã đăng ký"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${account.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                              {account.is_active ? "🟢 Hoạt động" : "🔴 Đã bị khóa"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-300">{account.conversations}</td>
                          <td className="p-3 font-mono text-xs text-emerald-400 font-bold">{account.messages_today}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 min-w-[140px]">
                              <input
                                aria-label={`Giới hạn tin cho ${account.display_name}`}
                                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1 outline-none focus:border-emerald-500 w-20 font-mono"
                                min={0}
                                onChange={(event) =>
                                  setLimitDrafts((current) => ({
                                    ...current,
                                    [account.user_id]: event.target.value,
                                  }))
                                }
                                placeholder="Mặc định"
                                type="number"
                                value={limitDrafts[account.user_id] ?? ""}
                              />
                              <button
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                                disabled={loading}
                                onClick={() => void saveUserLimit(account.user_id)}
                                type="button"
                              >
                                Lưu
                              </button>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">
                            {account.input_tokens_today} / {account.output_tokens_today}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleStatus(account.user_id, account.is_active)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                                  account.is_active
                                    ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                                }`}
                              >
                                {account.is_active ? "🔒 Khóa" : "🔓 Mở"}
                              </button>

                              {!account.is_guest && (
                                <button
                                  onClick={() => handleToggleRole(account.user_id, account.is_admin)}
                                  className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                                  title="Thêm quyền Admin"
                                >
                                  👑 Nâng Admin
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteUser(account.user_id, account.display_name)}
                                className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                                title="Xóa tài khoản"
                              >
                                🗑️ Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 4: ADMIN MANAGEMENT */}
          {activeNav === "admins" && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    👑 Quản Lý Tài Khoản Admin ({adminUsers.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Danh sách Quản trị viên có toàn quyền truy cập bảng Admin hệ thống.</p>
                </div>

                <button
                  onClick={() => setShowCreateAdminModal(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  ➕ Tạo Tài Khoản Admin Mới
                </button>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-[750px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                      <th className="p-3">Admin</th>
                      <th className="p-3">Email & Username</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Ngày tạo</th>
                      <th className="p-3">Đăng nhập lần cuối</th>
                      <th className="p-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((admin) => (
                      <tr className="border-b border-slate-800/60 hover:bg-slate-900/40 transition-colors" key={admin.user_id}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
                              👑
                            </div>
                            <span className="font-bold text-white text-xs">{admin.display_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs">
                          <div className="flex flex-col">
                            <span className="text-slate-200">{admin.email ?? "N/A"}</span>
                            <span className="text-[11px] text-slate-400">@{admin.username ?? "n/a"}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${admin.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                            {admin.is_active ? "🟢 Hoạt động" : "🔴 Bị khóa"}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-400 font-mono">
                          {new Date(admin.created_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="p-3 text-xs text-slate-400 font-mono">
                          {admin.last_login_at ? new Date(admin.last_login_at).toLocaleString("vi-VN") : "Chưa đăng nhập"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleRole(admin.user_id, admin.is_admin)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                              title="Hạ cấp quyền Admin"
                            >
                              🔻 Chuyển thành User
                            </button>

                            <button
                              onClick={() => handleToggleStatus(admin.user_id, admin.is_active)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                                admin.is_active
                                  ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              }`}
                            >
                              {admin.is_active ? "🔒 Khóa" : "🔓 Mở"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 5: SYSTEM HEALTH & CONFIG */}
          {activeNav === "system" && config && (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col gap-6">
              <div className="flex flex-col gap-1 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  ⚙️ Thông Số Kỹ Thuật & Cấu Hình Hệ Thống
                </h2>
                <p className="text-xs text-slate-400">Các thông số cấu hình hạ tầng backend, môi trường và giới hạn tài nguyên.</p>
              </div>

              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <InfoBox label="Môi Trường Chạy" value={config.app_env} />
                <InfoBox label="Ứng Dụng" value={`${config.app_name} v${config.app_version}`} />
                <InfoBox label="Model Đang Chạy" value={config.default_llm_model ?? "Chưa cấu hình"} />
                <InfoBox label="Model Rẻ (Cheap Model)" value={config.cheap_llm_model ?? "Chưa cấu hình"} />
                <InfoBox label="Model Dự Phòng (Fallback)" value={config.fallback_llm_model ?? "Chưa cấu hình"} />
                <InfoBox label="Groq Provider" value={config.groq_configured ? "🟢 Đã Cấu Hình" : "🔴 Chưa Cấu Hình"} />
                <InfoBox label="Redis Caching" value={config.redis_configured ? "🟢 Đã Cấu Hình" : "⚪ Không Dùng"} />
                <InfoBox label="Rate Limit" value={`${config.rate_limit_per_minute} req/phút`} />
                <InfoBox label="Context Token Budget" value={`${config.context_token_budget} Tokens`} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE ADMIN MODAL */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                👑 Tạo Tài Khoản Admin Mới
              </h3>
              <button
                onClick={() => setShowCreateAdminModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Email Admin</label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Username</label>
                <input
                  type="text"
                  required
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  placeholder="admin_sys"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Tên Hiển Thị</label>
                <input
                  type="text"
                  value={newAdminDisplayName}
                  onChange={(e) => setNewAdminDisplayName(e.target.value)}
                  placeholder="Super Admin"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Mật Khẩu</label>
                <PasswordInput
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-amber-950/20 disabled:opacity-50"
                >
                  {loading ? "Đang tạo..." : "Tạo Admin 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// HELPER COMPONENTS FOR DASHBOARD

function NavItem({
  icon,
  label,
  active,
  onClick,
  count,
  badge,
  highlight,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
        active
          ? highlight
            ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/20"
            : "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/20"
          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span>{icon}</span>
        <span>{label}</span>
      </div>

      {count !== undefined && (
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
            active ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-300"
          }`}
        >
          {count}
        </span>
      )}

      {badge && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            active ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: "emerald" | "teal" | "slate" | "cyan" | "amber" | "indigo" | "purple" | "rose";
}) {
  const colorStyles = {
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    teal: "border-teal-500/20 bg-teal-500/5 text-teal-400",
    slate: "border-slate-800 bg-slate-900/60 text-slate-400",
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    indigo: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-400",
    rose: "border-rose-500/20 bg-rose-500/5 text-rose-400",
  };

  return (
    <div className={`border rounded-2xl p-3 flex flex-col justify-between ${colorStyles[color]}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] font-medium text-slate-400 truncate">{label}</span>
        <span className="shrink-0">{icon}</span>
      </div>
      <div className="mt-2 text-sm sm:text-base font-black tracking-tight text-white font-mono truncate">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function TokenBarChart({ inputTokens, outputTokens }: { inputTokens: number; outputTokens: number }) {
  const total = inputTokens + outputTokens || 1;
  const inputPct = Math.round((inputTokens / total) * 100);
  const outputPct = Math.round((outputTokens / total) * 100);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row justify-between text-xs font-semibold gap-1">
          <span className="text-indigo-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
            Input Tokens: {inputTokens.toLocaleString()} ({inputPct}%)
          </span>
          <span className="text-purple-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
            Output Tokens: {outputTokens.toLocaleString()} ({outputPct}%)
          </span>
        </div>

        <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
          <div
            style={{ width: `${Math.max(inputPct, 2)}%` }}
            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-l-full transition-all duration-500"
            title={`Input: ${inputTokens}`}
          />
          <div
            style={{ width: `${Math.max(outputPct, 2)}%` }}
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-r-full transition-all duration-500"
            title={`Output: ${outputTokens}`}
          />
        </div>
      </div>
    </div>
  );
}

function UserDistributionDonut({
  registered,
  guests,
  admins,
}: {
  registered: number;
  guests: number;
  admins: number;
}) {
  const total = registered + guests + admins || 1;
  const regPct = Math.round((registered / total) * 100);
  const guestPct = Math.round((guests / total) * 100);
  const adminPct = Math.round((admins / total) * 100);

  return (
    <div className="flex flex-col gap-4 py-2 items-center">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#1e293b"
            strokeWidth="3.8"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#10b981"
            strokeWidth="3.8"
            strokeDasharray={`${regPct}, 100`}
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3.8"
            strokeDasharray={`${adminPct}, 100`}
            strokeDashoffset={`-${regPct}`}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-base font-black text-white font-mono">{total}</span>
          <span className="text-[9px] text-slate-400">Tài khoản</span>
        </div>
      </div>

      <div className="w-full flex flex-col gap-1.5 text-xs font-semibold">
        <div className="flex justify-between items-center text-emerald-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Đã đăng ký
          </span>
          <span className="font-mono">{registered} ({regPct}%)</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            Khách
          </span>
          <span className="font-mono">{guests} ({guestPct}%)</span>
        </div>
        <div className="flex justify-between items-center text-amber-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Admin
          </span>
          <span className="font-mono">{admins} ({adminPct}%)</span>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-1">
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      <span className="text-xs font-bold text-white font-mono break-all">{value}</span>
    </div>
  );
}
