"use client";

import { useCallback, useEffect, useState } from "react";
import { Message, api } from "@/lib/api";

export function useChatStream(token: string | null, activeConvId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputContent, setInputContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!token || !activeConvId) {
      setMessages([]);
      return;
    }
    try {
      const res = await api.messages(token, activeConvId);
      setMessages(res.items);
    } catch {
      setMessages([]);
    }
  }, [token, activeConvId]);

  useEffect(() => {
    let active = true;
    if (token && activeConvId) {
      api
        .messages(token, activeConvId)
        .then((res) => {
          if (active) setMessages(res.items);
        })
        .catch(() => {
          if (active) setMessages([]);
        });
    } else {
      Promise.resolve().then(() => {
        if (active) setMessages([]);
      });
    }

    return () => {
      active = false;
    };
  }, [token, activeConvId]);

  const sendMessage = useCallback(
    async (overrideContent?: string) => {
      const text = (overrideContent ?? inputContent).trim();
      if (!text || !token || !activeConvId || isStreaming) return;

      if (!overrideContent) {
        setInputContent("");
      }
      setStreamError(null);
      setIsStreaming(true);

      const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      try {
        await api.streamMessage(
          token,
          activeConvId,
          { content: text, client_message_id: clientMsgId },
          (event, data) => {
            if (event === "message.created") {
              const assistantMsg = data.message as Message;
              const userMsg = data.user_message as Message;
              setMessages((prev) => {
                const filtered = prev.filter(
                  (m) => m.id !== assistantMsg.id && m.id !== userMsg?.id,
                );
                return [...filtered, ...(userMsg ? [userMsg] : []), assistantMsg];
              });
            } else if (event === "message.delta") {
              const id = data.id as string;
              const delta = data.delta as string;
              const model = data.model as string | undefined;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id
                    ? {
                        ...m,
                        content: m.content + delta,
                        ...(model ? { model } : {}),
                      }
                    : m,
                ),
              );
            } else if (event === "message.completed") {
              const completedMsg = data.message as Message;
              setMessages((prev) =>
                prev.map((m) => (m.id === completedMsg.id ? completedMsg : m)),
              );
            } else if (event === "message.failed") {
              const id = data.id as string;
              const err = (data.error as string) || "Streaming failed";
              setStreamError(err);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id ? { ...m, status: "failed", error_code: "LLM_ERROR" } : m,
                ),
              );
            }
          },
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể gửi tin nhắn";
        setStreamError(message);
      } finally {
        setIsStreaming(false);
      }
    },
    [token, activeConvId, inputContent, isStreaming],
  );

  return {
    messages,
    inputContent,
    setInputContent,
    isStreaming,
    streamError,
    setStreamError,
    fetchMessages,
    sendMessage,
  };
}
