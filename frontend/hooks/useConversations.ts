"use client";

import { useCallback, useEffect, useState } from "react";
import { Conversation, Personality, api } from "@/lib/api";

const BACKGROUND_KEY = "chat_crazy_conversation_backgrounds";

export const backgroundTemplates = [
  { value: "mint", label: "Bạc hà" },
  { value: "sky", label: "Trời xanh" },
  { value: "sunrise", label: "Bình minh" },
  { value: "paper", label: "Giấy ghi chú" },
  { value: "slate", label: "Tập trung" },
] as const;

export type BackgroundTemplate = (typeof backgroundTemplates)[number]["value"];

function loadBackgrounds(): Record<string, BackgroundTemplate> {
  try {
    const parsed = JSON.parse(localStorage.getItem(BACKGROUND_KEY) ?? "{}");
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function useConversations(token: string | null, initialConvId?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId || null);
  const [showArchived, setShowArchived] = useState(false);
  const [backgrounds, setBackgrounds] = useState<Record<string, BackgroundTemplate>>(loadBackgrounds);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(
    async (incArchived = showArchived) => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.conversations(token, incArchived);
        setConversations(res.items);
        if (res.items.length > 0 && !activeConvId) {
          setActiveConvId(initialConvId || res.items[0].id);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    },
    [token, showArchived, activeConvId, initialConvId],
  );

  useEffect(() => {
    let active = true;
    api
      .personalities()
      .then((list) => {
        if (active) setPersonalities(list);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .conversations(token, showArchived)
      .then((res) => {
        if (active) {
          setConversations(res.items);
          if (res.items.length > 0 && !activeConvId) {
            setActiveConvId(initialConvId || res.items[0].id);
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [token, showArchived, activeConvId, initialConvId]);

  const createConversation = useCallback(
    async (personalityCode = "friendly", firstMessage?: string, aiNickname?: string) => {
      if (!token) return null;
      try {
        const created = await api.createConversation(token, {
          personality_code: personalityCode,
          first_message: firstMessage,
          ai_nickname: aiNickname,
        });
        setConversations((prev) => [created, ...prev]);
        setActiveConvId(created.id);
        return created;
      } catch (err) {
        throw err;
      }
    },
    [token],
  );

  const archiveConversation = useCallback(
    async (id: string) => {
      if (!token) return;
      await api.archiveConversation(token, id);
      await fetchConversations();
    },
    [token, fetchConversations],
  );

  const unarchiveConversation = useCallback(
    async (id: string) => {
      if (!token) return;
      await api.unarchiveConversation(token, id);
      await fetchConversations();
    },
    [token, fetchConversations],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!token) return;
      await api.deleteConversation(token, id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
      }
    },
    [token, activeConvId],
  );

  const updateConversation = useCallback(
    async (id: string, data: { title?: string; personality_code?: string; ai_nickname?: string }) => {
      if (!token) return;
      const updated = await api.updateConversation(token, id, data);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [token],
  );

  const setConversationBackground = useCallback((id: string, bg: BackgroundTemplate) => {
    setBackgrounds((prev) => {
      const next = { ...prev, [id]: bg };
      localStorage.setItem(BACKGROUND_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  return {
    conversations,
    personalities,
    activeConvId,
    setActiveConvId,
    activeConversation,
    showArchived,
    setShowArchived,
    backgrounds,
    setConversationBackground,
    loading,
    fetchConversations,
    createConversation,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    updateConversation,
  };
}
