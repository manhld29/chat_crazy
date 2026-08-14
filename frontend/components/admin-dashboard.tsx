"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";

import {
  AdminAccountUsage,
  AdminConfigResponse,
  AdminDashboardResponse,
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
    try {
      const token = storedAdminToken;
      const [nextConfig, nextDashboard, nextAccounts] = await Promise.all([
        api.adminConfig(token),
        api.adminDashboard(token),
        api.adminAccounts(token),
      ]);
      setConfig(nextConfig);
      setDashboard(nextDashboard);
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
      <div className="mx-auto grid max-w-[1440px] gap-4">
        <section className="panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="page-title">Admin Dashboard</h1>
              <p className="page-subtitle">
                Tách riêng cấu hình hệ thống, hoạt động và thống kê tài khoản.
              </p>
            </div>
            <form className="grid gap-2" onSubmit={load}>
              <button className="primary-button self-end" disabled={loading} type="submit">
                {loading ? "Đang tải" : "Tải dashboard"}
              </button>
            </form>
          </div>
          {error && (
            <div className="mt-4 rounded-md border border-[var(--danger-border)] bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
              {error}
            </div>
          )}
        </section>

        {dashboard && (
          <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
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
                    {account.last_login_at ? formatDate(account.last_login_at) : "Chưa có"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 && (
            <p className="mt-4 text-sm text-[var(--muted)]">Chưa tải dữ liệu tài khoản.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export function AdminLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api.adminLogin({ identifier, password });
      sessionStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, result.access_token);
      router.replace("/admin");
    } catch (unknownError) {
      setError(
        unknownError instanceof ApiError || unknownError instanceof Error
          ? unknownError.message
          : "Không đăng nhập được admin",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-main grid min-h-dvh place-items-center p-4 text-[var(--foreground)]">
      <section className="panel w-full max-w-md">
        <h1 className="page-title">Đăng nhập admin</h1>
        <p className="page-subtitle">
          Dùng tài khoản đã được phân quyền admin trên backend.
        </p>
        <form className="mt-5 grid gap-3" onSubmit={submit}>
          <Field
            label="Email hoặc username"
            onChange={setIdentifier}
            value={identifier}
          />
          <Field
            label="Mật khẩu"
            onChange={setPassword}
            type="password"
            value={password}
          />
          <button
            className="primary-button"
            disabled={loading || !identifier.trim() || !password}
            type="submit"
          >
            {loading ? "Đang kiểm tra" : "Đăng nhập admin"}
          </button>
        </form>
        {error && (
          <div className="mt-4 rounded-md border border-[var(--danger-border)] bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <label className="grid gap-2 text-sm font-semibold" htmlFor={id}>
      {label}
      {type === "password" ? (
        <PasswordInput
          className="input"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      ) : (
        <input
          className="input"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          value={value}
        />
      )}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-3">
      <dt className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
