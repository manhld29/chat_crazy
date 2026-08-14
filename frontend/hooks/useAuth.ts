"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPublic, api } from "@/lib/api";

const ACCESS_TOKEN_KEY = "chat_crazy_access_token";
const USER_KEY = "chat_crazy_user";

export type StoredSession = {
  accessToken: string;
  refreshToken: string | null;
  user: UserPublic;
};

export function useAuth() {
  const [session, setSession] = useState<StoredSession | null>(() => {
    if (typeof window === "undefined") return null;
    const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser) as UserPublic;
        return { accessToken: savedToken, refreshToken: null, user };
      } catch {
        return null;
      }
    }
    return null;
  });

  const [authError, setAuthError] = useState<string | null>(null);

  const saveSession = useCallback((token: string, user: UserPublic, refresh: string | null = null) => {
    const nextSession: StoredSession = { accessToken: token, refreshToken: refresh, user };
    setSession(nextSession);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    if (session?.accessToken) {
      api
        .me(session.accessToken)
        .then((updatedUser) => {
          saveSession(session.accessToken, updatedUser);
        })
        .catch(() => {
          // Keep local session if fetch fails
        });
    }
  }, [saveSession, session?.accessToken]);

  const login = useCallback(
    async (email: string, pass: string) => {
      setAuthError(null);
      try {
        const res = await api.login({ email, password: pass });
        saveSession(res.access_token, res.user, res.refresh_token);
        return res;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
        setAuthError(message);
        throw err;
      }
    },
    [saveSession],
  );

  const register = useCallback(
    async (email: string, pass: string, name: string) => {
      setAuthError(null);
      try {
        const res = await api.register({ email, password: pass, display_name: name });
        saveSession(res.access_token, res.user, res.refresh_token);
        return res;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Đăng ký thất bại";
        setAuthError(message);
        throw err;
      }
    },
    [saveSession],
  );

  const guestLogin = useCallback(
    async (name: string) => {
      setAuthError(null);
      try {
        const res = await api.guest(name);
        saveSession(res.access_token, res.user, res.refresh_token);
        return res;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Đăng nhập Khách thất bại";
        setAuthError(message);
        throw err;
      }
    },
    [saveSession],
  );

  const logout = useCallback(async () => {
    if (session?.accessToken) {
      try {
        await api.logout(session.accessToken, session.refreshToken);
      } catch {
        // Ignore logout network errors
      }
    }
    clearSession();
  }, [clearSession, session]);

  const upgradeGuest = useCallback(
    async (email: string, pass: string, name: string) => {
      if (!session?.accessToken) return;
      setAuthError(null);
      try {
        const res = await api.upgradeGuest(session.accessToken, {
          email,
          password: pass,
          display_name: name,
        });
        saveSession(res.access_token, res.user, res.refresh_token);
        return res;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Nâng cấp tài khoản thất bại";
        setAuthError(message);
        throw err;
      }
    },
    [session, saveSession],
  );

  return {
    session,
    authError,
    setAuthError,
    loading: false,
    login,
    register,
    guestLogin,
    logout,
    upgradeGuest,
    saveSession,
  };
}
