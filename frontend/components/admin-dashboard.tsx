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
    <main className="app-main min-h-dvh p-4 text-[var(--foreground)] sm:p-6 lg:p-8 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="panel w-full max-w-md flex flex-col gap-4">
        <h1 className="page-title text-center">Đăng nhập Admin</h1>
        {error && <div className="text-rose-500 text-xs font-medium">⚠️ {error}</div>}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted)]">Email / Username</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted)]">Mật khẩu</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input"
          />
        </div>
        <button type="submit" disabled={submitting} className="primary-button w-full mt-2">
          {submitting ? "Đang xử lý..." : "Đăng nhập Admin"}
        </button>
      </form>
    </main>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const storedAdminToken = useSyncExternalStore(
    subscribeAdminToken,
    getAdminTokenSnapshot,
    getAdminTokenServerSnapshot,
  );
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

  // Search & Branch Filter state
  const [activeTab, setActiveTab] = useState<"users" | "admins">("users");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Create Admin Form state
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
      <main className="app-main min-h-dvh p-4 text-[var(--foreground)] sm:p-6 lg:p-8">
        <section className="panel mx-auto max-w-xl">
          <h1 className="page-title">Đang kiểm tra phiên admin</h1>
          <p className="page-subtitle">Bạn sẽ được chuyển về trang đăng nhập nếu chưa có phiên.</p>
        </section>
      </main>
    );
  }

  // Separate regular users (excluding admins) and admin users
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

  return (
    <main className="app-main min-h-dvh p-4 text-[var(--foreground)] sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              Bảng quản trị hệ thống
              <span className="text-[11px] font-normal px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Tự làm mới (10s)
              </span>
            </h1>
            <p className="page-subtitle">Xem cấu hình, chỉ số sử dụng và quản lý người dùng toàn hệ thống.</p>
          </div>
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void loadData(false); }}>
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Đang làm mới..." : "Làm mới dữ liệu 🔄"}
            </button>
          </form>
        </header>

        {error && <div className="panel text-rose-500 font-medium">⚠️ Lỗi: {error}</div>}
        {actionSuccess && <div className="panel text-emerald-400 font-medium">✅ {actionSuccess}</div>}

        {dashboard && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <Metric label="Tổng tài khoản" value={String(dashboard.total_users)} />
            <Metric label="Đã đăng ký" value={String(dashboard.registered_users)} />
            <Metric label="Khách" value={String(dashboard.guest_users)} />
            <Metric label="Hội thoại" value={String(dashboard.conversations)} />
            <Metric label="Tin hôm nay" value={String(dashboard.messages_today)} />
            <Metric label="Input tokens" value={String(dashboard.input_tokens_today)} />
            <Metric label="Output tokens" value={String(dashboard.output_tokens_today)} />
            <Metric label="Request lỗi" value={String(dashboard.failed_requests_today)} />
          </section>
        )}

        {/* System Model Settings Section */}
        {modelConfig && (
          <section className="panel border border-slate-800 bg-slate-900/80">
            <h2 className="section-title flex items-center gap-2">
              🤖 Cấu hình Model AI Hệ thống
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Admin có thể chọn chế độ <strong>Tự động (Free Pool Failover)</strong> hoặc <strong>Cấu hình Thủ công (Manual Model Setting)</strong>.
            </p>

            {saveModelSuccess && (
              <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-medium">
                ✅ {saveModelSuccess}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={manualModeDraft}
                  onChange={(e) => setManualModeDraft(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <span className="text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded shadow-sm">
                  Bật Cấu hình Thủ công (Manual Model Setting)
                </span>
              </label>

              {manualModeDraft ? (
                <div className="flex flex-col gap-2 p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <label className="text-xs text-slate-400 font-medium">Chọn Model cố định cho hệ thống:</label>
                  <select
                    value={selectedModelDraft}
                    onChange={(e) => setSelectedModelDraft(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 font-mono"
                  >
                    {modelConfig.available_models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-amber-400 mt-1">
                    ⚠️ Hệ thống sẽ ưu tiên chạy Model <strong>{selectedModelDraft}</strong> này.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                  ✨ <strong>Đang ở Chế độ Tự động:</strong> Hệ thống tự chọn và luân chuyển các Model Free tốt nhất trong danh sách (OpenRouter Auto Free, Llama 3.3 70B Free, Gemini 2.0 Flash Free, DeepSeek V3, DeepSeek R1...).
                </div>
              )}

              <button
                type="button"
                onClick={saveModelConfig}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors self-start shadow-md shadow-emerald-950/20 disabled:opacity-50"
              >
                {loading ? "Đang lưu..." : "Lưu Cấu Hình Model"}
              </button>
            </div>
          </section>
        )}

        {/* User Management Section with 2 Tabs / Branches */}
        <section className="panel flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-3">
            <div>
              <h2 className="section-title">👥 Quản Lý Người Dùng Toàn Hệ Thống</h2>
              <p className="text-xs text-slate-400 mt-0.5">Phân chia quản lý người dùng phổ thông và danh sách quản trị viên.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "users"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/30"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                👤 Người dùng Phổ thông ({accounts.filter((a) => !a.is_admin).length})
              </button>
              <button
                onClick={() => setActiveTab("admins")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "admins"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-950/30"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                👑 Quản trị viên Admin ({adminUsers.length})
              </button>
            </div>
          </div>

          {/* Branch 1: Regular Users Management */}
          {activeTab === "users" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="🔍 Tìm theo Tên, Email hoặc Username..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 w-full max-w-md"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                      <th className="p-3">Tên & Thông tin</th>
                      <th className="p-3">Loại</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Hội thoại</th>
                      <th className="p-3">Tin hôm nay</th>
                      <th className="p-3">Giới hạn/ngày</th>
                      <th className="p-3">Tokens (In/Out)</th>
                      <th className="p-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-xs text-slate-500">
                          Không tìm thấy người dùng phù hợp.
                        </td>
                      </tr>
                    ) : (
                      regularUsers.map((account) => (
                        <tr className="border-b border-slate-800/60 hover:bg-slate-900/40" key={account.user_id}>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs">{account.display_name}</span>
                              <span className="text-[11px] text-slate-400">{account.email ?? account.username ?? "Tài khoản Khách"}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${account.is_guest ? "bg-slate-800 text-slate-400" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                              {account.is_guest ? "Khách" : "Thành viên"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${account.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                              {account.is_active ? "🟢 Đang hoạt động" : "🔴 Đã bị khóa"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs">{account.conversations}</td>
                          <td className="p-3 font-mono text-xs text-emerald-400 font-bold">{account.messages_today}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 min-w-[140px]">
                              <input
                                aria-label={`Giới hạn tin cho ${account.display_name}`}
                                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2 py-1 outline-none focus:border-emerald-500 w-20"
                                min={0}
                                onChange={(event) =>
                                  setLimitDrafts((current) => ({
                                    ...current,
                                    [account.user_id]: event.target.value,
                                  }))
                                }
                                placeholder="Theo plan"
                                type="number"
                                value={limitDrafts[account.user_id] ?? ""}
                              />
                              <button
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold px-2 py-1 rounded transition-colors"
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
                                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
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
                                  className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                                  title="Thêm quyền Admin cho user này"
                                >
                                  👑 Thêm Admin
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteUser(account.user_id, account.display_name)}
                                className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                                title="Xóa vĩnh viễn user"
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

          {/* Branch 2: Admin Accounts Management */}
          {activeTab === "admins" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Danh sách tất cả Quản trị viên có quyền truy cập bảng Admin hệ thống.</p>
                <button
                  onClick={() => setShowCreateAdminModal(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-md shadow-amber-950/20 flex items-center gap-1.5"
                >
                  ➕ Tạo Tài khoản Admin Mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full border-collapse text-left text-sm">
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
                      <tr className="border-b border-slate-800/60 hover:bg-slate-900/40" key={admin.user_id}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold">👑</span>
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
                          <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${admin.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
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
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                              title="Gỡ quyền Admin của tài khoản này"
                            >
                              🔻 Chuyển thành User thường
                            </button>

                            <button
                              onClick={() => handleToggleStatus(admin.user_id, admin.is_active)}
                              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
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
        </section>

        {config && (
          <section className="panel">
            <h2 className="section-title">Cấu hình chi tiết hệ thống</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Info label="Môi trường" value={config.app_env} />
              <Info label="Ứng dụng" value={`${config.app_name} ${config.app_version}`} />
              <Info label="Model hiện tại (Đang chạy)" value={config.default_llm_model ?? "Chưa cấu hình"} />
              <Info label="Model rẻ" value={config.cheap_llm_model ?? "Chưa cấu hình"} />
              <Info label="Model fallback" value={config.fallback_llm_model ?? "Chưa cấu hình"} />
              <Info label="Groq" value={config.groq_configured ? "Đã cấu hình" : "Chưa cấu hình"} />
              <Info label="Redis" value={config.redis_configured ? "Đã cấu hình" : "Không dùng"} />
              <Info label="Rate limit/phút" value={String(config.rate_limit_per_minute)} />
              <Info label="Context budget" value={String(config.context_token_budget)} />
            </div>
          </section>
        )}
      </div>

      {/* Modal create new Admin */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                👑 Tạo Tài khoản Admin Mới
              </h3>
              <button
                onClick={() => setShowCreateAdminModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Email Admin</label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Username</label>
                <input
                  type="text"
                  required
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  placeholder="admin_sys"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Tên hiển thị</label>
                <input
                  type="text"
                  value={newAdminDisplayName}
                  onChange={(e) => setNewAdminDisplayName(e.target.value)}
                  placeholder="Super Admin"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Mật khẩu</label>
                <PasswordInput
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-md shadow-amber-950/20 disabled:opacity-50"
                >
                  {loading ? "Đang tạo..." : "Tạo Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-3 text-center">
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-lg font-bold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-3">
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xs font-semibold text-[var(--foreground)]">{value}</div>
    </div>
  );
}
