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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storedAdminToken) {
      router.replace("/admin/login");
    }
  }, [router, storedAdminToken]);

  async function load(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setSaveModelSuccess("");
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
      setManualModeDraft(nextModelConfig.manual_mode);
      setSelectedModelDraft(nextModelConfig.selected_model);
      setLimitDrafts(
        Object.fromEntries(
          nextAccounts.items.map((account) => [
            account.user_id,
            account.daily_message_limit?.toString() ?? "",
          ]),
        ),
      );
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Không tải được dữ liệu admin",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveUserLimit(userId: string) {
    setLoading(true);
    setError("");
    try {
      const rawValue = limitDrafts[userId]?.trim() ?? "";
      const nextLimit = rawValue === "" ? null : Number(rawValue);
      if (nextLimit !== null && !Number.isFinite(nextLimit)) {
        throw new Error("Hạn mức không hợp lệ");
      }
      await api.updateAdminUserLimit(storedAdminToken, userId, nextLimit);
      const nextAccounts = await api.adminAccounts(storedAdminToken);
      setAccounts(nextAccounts.items);
      setLimitDrafts(
        Object.fromEntries(
          nextAccounts.items.map((account) => [
            account.user_id,
            account.daily_message_limit?.toString() ?? "",
          ]),
        ),
      );
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

  return (
    <main className="app-main min-h-dvh p-4 text-[var(--foreground)] sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Bảng quản trị hệ thống</h1>
            <p className="page-subtitle">Xem cấu hình, chỉ số sử dụng và quản lý tài khoản.</p>
          </div>
          <form className="flex items-center gap-2" onSubmit={(event) => void load(event)}>
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Đang tải..." : "Tải dữ liệu admin"}
            </button>
          </form>
        </header>

        {error && <div className="panel text-rose-500 font-medium">⚠️ Lỗi: {error}</div>}

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
                <span className="text-sm font-semibold text-white">
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

        {config && (
          <section className="panel">
            <h2 className="section-title">Cấu hình hệ thống</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Info label="Môi trường" value={config.app_env} />
              <Info label="Ứng dụng" value={`${config.app_name} ${config.app_version}`} />
              <Info label="Model mặc định" value={config.default_llm_model ?? "Chưa cấu hình"} />
              <Info label="Model rẻ" value={config.cheap_llm_model ?? "Chưa cấu hình"} />
              <Info label="Model fallback" value={config.fallback_llm_model ?? "Chưa cấu hình"} />
              <Info label="Groq" value={config.groq_configured ? "Đã cấu hình" : "Chưa cấu hình"} />
              <Info label="Redis" value={config.redis_configured ? "Đã cấu hình" : "Không dùng"} />
              <Info label="Rate limit/phút" value={String(config.rate_limit_per_minute)} />
              <Info label="Context budget" value={String(config.context_token_budget)} />
            </div>
          </section>
        )}

        <section className="panel overflow-x-auto">
          <h2 className="section-title">Thống kê tài khoản hôm nay</h2>
          <table className="mt-4 min-w-[900px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-3">Tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Hội thoại</th>
                <th className="p-3">Tin hôm nay</th>
                <th className="p-3">Giới hạn/ngày</th>
                <th className="p-3">Input token</th>
                <th className="p-3">Output token</th>
                <th className="p-3">Lần đăng nhập cuối</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr className="border-b border-[var(--border)]" key={account.user_id}>
                  <td className="p-3 font-semibold">{account.display_name}</td>
                  <td className="p-3">{account.email ?? "Khách"}</td>
                  <td className="p-3">{account.is_guest ? "Khách" : "Đã đăng ký"}</td>
                  <td className="p-3">{account.conversations}</td>
                  <td className="p-3">{account.messages_today}</td>
                  <td className="p-3">
                    <div className="grid min-w-[180px] gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        aria-label={`Giới hạn tin mỗi ngày cho ${account.display_name}`}
                        className="input"
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
                        className="secondary-button"
                        disabled={loading}
                        onClick={() => void saveUserLimit(account.user_id)}
                        type="button"
                      >
                        Lưu
                      </button>
                    </div>
                  </td>
                  <td className="p-3">{account.input_tokens_today}</td>
                  <td className="p-3">{account.output_tokens_today}</td>
                  <td className="p-3">
                    {account.last_login_at
                      ? new Date(account.last_login_at).toLocaleString("vi-VN")
                      : "Chưa có"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
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
