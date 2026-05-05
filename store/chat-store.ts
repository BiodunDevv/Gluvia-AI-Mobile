import api from "@/lib/api";
import { getDatabase } from "@/lib/offline-db";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  status?: "sending" | "sent" | "failed";
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  isStreaming: boolean;
  error: string | null;
  loadConversations: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  sendMessage: (
    content: string
  ) => Promise<{ assistant: ChatMessage | null; conversationId?: string }>;
  retryMessage: (
    failedMessageId: string
  ) => Promise<{ assistant: ChatMessage | null; conversationId?: string }>;
  deleteConversation: (id: string) => Promise<void>;
  clearAllConversations: () => Promise<void>;
}

const TEMP_PREFIX = "local-chat-";

const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function initChatTables() {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      last_message TEXT,
      message_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}

async function getLocalConversations(): Promise<Conversation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    last_message: string | null;
    message_count: number;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM conversations ORDER BY updated_at DESC`);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    lastMessage: row.last_message || undefined,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function getLocalMessages(conversationId: string): Promise<ChatMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata: string | null;
    created_at: string;
  }>(
    `SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC`,
    [conversationId]
  );

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
  }));
}

async function upsertConversationLocal(conversation: Conversation, synced = 1) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO conversations (
      id, title, last_message, message_count, created_at, updated_at, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      conversation.id,
      conversation.title,
      conversation.lastMessage || null,
      conversation.messageCount,
      conversation.createdAt,
      conversation.updatedAt,
      synced,
    ]
  );
}

async function insertMessageLocal(message: ChatMessage, synced = 1) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO chat_messages (
      id, conversation_id, role, content, metadata, created_at, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      message.id,
      message.conversationId,
      message.role,
      message.content,
      message.metadata ? JSON.stringify(message.metadata) : null,
      message.createdAt,
      synced,
    ]
  );
}

async function replaceConversationMessagesLocal(
  conversationId: string,
  messages: ChatMessage[],
  synced = 1
) {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM chat_messages WHERE conversation_id = ?`, [
    conversationId,
  ]);

  for (const message of messages) {
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_messages (
        id, conversation_id, role, content, metadata, created_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversationId,
        message.role,
        message.content,
        message.metadata ? JSON.stringify(message.metadata) : null,
        message.createdAt,
        synced,
      ]
    );
  }
}

async function renameConversationLocal(oldId: string, newConversation: Conversation) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE chat_messages SET conversation_id = ? WHERE conversation_id = ?`,
    [newConversation.id, oldId]
  );
  await db.runAsync(`DELETE FROM conversations WHERE id = ?`, [oldId]);
  await upsertConversationLocal(newConversation, 1);
}

async function deleteConversationLocal(id: string) {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM chat_messages WHERE conversation_id = ?`, [id]);
  await db.runAsync(`DELETE FROM conversations WHERE id = ?`, [id]);
}

async function clearAllConversationsLocal() {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM chat_messages`);
  await db.runAsync(`DELETE FROM conversations`);
}

async function deleteMessagesLocal(messageIds: string[]) {
  if (!messageIds.length) {
    return;
  }

  const db = await getDatabase();
  const placeholders = messageIds.map(() => "?").join(", ");
  await db.runAsync(
    `DELETE FROM chat_messages WHERE id IN (${placeholders})`,
    messageIds
  );
}

function mergeStreamChunk(current: string, incoming: string) {
  const existing = String(current || "");
  const next = String(incoming || "");

  if (!next) {
    return existing;
  }

  if (!existing) {
    return next;
  }

  if (next === existing) {
    return existing;
  }

  if (next.startsWith(existing)) {
    return next;
  }

  if (existing.startsWith(next)) {
    return existing;
  }

  const maxOverlap = Math.min(existing.length, next.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    if (existing.slice(-size) === next.slice(0, size)) {
      return `${existing}${next.slice(size)}`;
    }
  }

  return existing.endsWith(next) ? existing : `${existing}${next}`;
}

function getApiErrorMessage(error: any, fallback = "Failed to send message") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function isRetryableConversationError(error: any, fallbackStatus?: number) {
  const status = error?.response?.status || error?.status || fallbackStatus;
  return status === 400 || status === 404;
}

function dedupeMessages(messages: ChatMessage[]) {
  const deduped: ChatMessage[] = [];
  const seen = new Set<string>();

  for (const message of messages) {
    const fingerprint = [
      message.conversationId,
      message.role,
      message.content.trim(),
      new Date(message.createdAt).getTime(),
    ].join("::");

    if (seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    deduped.push(message);
  }

  return deduped.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

async function streamChatRequest({
  conversationId,
  message,
  onConversation,
  onChunk,
}: {
  conversationId?: string;
  message: string;
  onConversation?: (conversation: any) => void;
  onChunk?: (chunk: string) => void;
}) {
  const token = await SecureStore.getItemAsync("authToken");
  const response = await fetch(`${api.defaults.baseURL}/reports/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      conversationId,
      message,
    }),
  });

  if (!response.ok) {
    let message = "Failed to stream chat response";
    try {
      const payload = await response.json();
      message =
        payload?.error?.message || payload?.message || payload?.error || message;
    } catch {}
    const error: any = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (!response.body || typeof response.body.getReader !== "function") {
    throw new Error("Streaming unsupported");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let conversationPayload: any = null;
  let donePayload: any = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const segments = buffer.split("\n\n");
    buffer = segments.pop() || "";

    for (const segment of segments) {
      const lines = segment.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event:"));
      const dataLine = lines.find((line) => line.startsWith("data:"));

      if (!eventLine || !dataLine) {
        continue;
      }

      const eventName = eventLine.replace("event:", "").trim();
      const rawData = dataLine.replace("data:", "").trim();

      try {
        const parsed = JSON.parse(rawData);

        if (eventName === "conversation") {
          conversationPayload = parsed?.conversation;
          onConversation?.(conversationPayload);
        } else if (eventName === "chunk") {
          onChunk?.(parsed?.content || "");
        } else if (eventName === "done") {
          donePayload = parsed?.message || null;
        }
      } catch {
        continue;
      }
    }
  }

  return {
    conversation: conversationPayload,
    message: donePayload,
  };
}

const mergeConversations = (
  remoteConversations: Conversation[],
  localConversations: Conversation[]
) => {
  const merged = new Map<string, Conversation>();

  for (const conversation of localConversations) {
    merged.set(conversation.id, conversation);
  }

  for (const conversation of remoteConversations) {
    merged.set(conversation.id, {
      ...merged.get(conversation.id),
      ...conversation,
    });
  }

  return [...merged.values()].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  isStreaming: false,
  error: null,

  loadConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      await initChatTables();
      const localConversations = await getLocalConversations();
      let remoteConversations: Conversation[] = [];

      try {
        const response = await api.get("/reports/chat/conversations");
        remoteConversations = (response.data?.data || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          lastMessage: item.lastMessage || "",
          messageCount: item.messageCount || 0,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));

        await Promise.all(
          remoteConversations.map((conversation) =>
            upsertConversationLocal(conversation, 1)
          )
        );
      } catch {}

      set({
        conversations: mergeConversations(remoteConversations, localConversations),
        isLoading: false,
      });
    } catch (error) {
      console.error("Error loading conversations:", error);
      set({ isLoading: false, error: "Failed to load conversations" });
    }
  },

  openConversation: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await initChatTables();
      let messages = await getLocalMessages(id);
      let conversation =
        get().conversations.find((item) => item.id === id) || null;

      if (!id.startsWith(TEMP_PREFIX)) {
        try {
          const response = await api.get(`/reports/chat/conversations/${id}`);
          const remoteConversation = response.data?.data;

          if (remoteConversation) {
            conversation = {
              id: remoteConversation.id,
              title: remoteConversation.title,
              lastMessage: remoteConversation.lastMessage || "",
              messageCount: remoteConversation.messages?.length || messages.length,
              createdAt: remoteConversation.createdAt,
              updatedAt: remoteConversation.updatedAt,
            };

            await upsertConversationLocal(conversation, 1);
            await replaceConversationMessagesLocal(
              remoteConversation.id,
              dedupeMessages(
                (remoteConversation.messages || []).map((message: any) => ({
                  id: message.id,
                  conversationId: remoteConversation.id,
                  role: message.role,
                  content: message.content,
                  createdAt: message.createdAt,
                }))
              ),
              1
            );
            messages = await getLocalMessages(remoteConversation.id);
          }
        } catch {}
      }

      set({
        currentConversation: conversation,
        messages,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error opening conversation:", error);
      set({ isLoading: false, error: "Failed to open conversation" });
    }
  },

  startNewConversation: async () => {
    set({
      currentConversation: null,
      messages: [],
      error: null,
    });
  },

  retryMessage: async (failedMessageId: string) => {
    const state = get();
    const failedMessage = state.messages.find(
      (message) => message.id === failedMessageId && message.status === "failed"
    );

    if (!failedMessage || failedMessage.role !== "user") {
      return { assistant: null };
    }

    const failedMessageTime = new Date(failedMessage.createdAt).getTime();
    const relatedMessageIds = state.messages
      .filter((message) => {
        if (message.conversationId !== failedMessage.conversationId) {
          return false;
        }

        if (message.status !== "failed") {
          return false;
        }

        const messageTime = new Date(message.createdAt).getTime();
        return Math.abs(messageTime - failedMessageTime) < 2000;
      })
      .map((message) => message.id);

    set((current) => ({
      error: null,
      messages: current.messages.filter(
        (message) => !relatedMessageIds.includes(message.id)
      ),
    }));
    await deleteMessagesLocal(relatedMessageIds);

    return get().sendMessage(failedMessage.content);
  },

  sendMessage: async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return { assistant: null };
    }

    set({ isSending: true, isStreaming: false, error: null });
    let activeConversationId: string | null = null;
    let pendingUserMessageId: string | null = null;
    let pendingAssistantMessageId: string | null = null;

    try {
      await initChatTables();
      let conversation = get().currentConversation;
      if (!conversation) {
        const now = new Date().toISOString();
        conversation = {
          id: `${TEMP_PREFIX}${Date.now()}`,
          title: "New conversation",
          lastMessage: "",
          messageCount: 0,
          createdAt: now,
          updatedAt: now,
        };
      }

      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: makeId("user"),
        conversationId: conversation.id,
        role: "user",
        content: trimmed,
        status: "sending",
        createdAt: now,
      };
      activeConversationId = conversation.id;
      pendingUserMessageId = userMessage.id;

      const optimisticConversation: Conversation = {
        ...conversation,
        title:
          conversation.title === "New conversation"
            ? trimmed.split(/\s+/).slice(0, 7).join(" ")
            : conversation.title,
        lastMessage: trimmed,
        messageCount: (conversation.messageCount || 0) + 1,
        updatedAt: now,
      };
      const assistantMessageId = makeId("assistant");
      pendingAssistantMessageId = assistantMessageId;

      set((state) => ({
        currentConversation: optimisticConversation,
        messages: [
          ...state.messages,
          userMessage,
          {
            id: assistantMessageId,
            conversationId: conversation!.id,
            role: "assistant",
            content: "",
            status: "sending",
            metadata: {
              source: "azure",
              safeFallbackUsed: false,
              chunks: [],
              streaming: true,
            },
            createdAt: now,
          },
        ],
        conversations: conversation.id.startsWith(TEMP_PREFIX)
          ? state.conversations
          : [
              optimisticConversation,
              ...state.conversations.filter((item) => item.id !== conversation.id),
            ],
        isStreaming: true,
      }));
      const streamedChunks: string[] = [];
      let streamedContent = "";
      let payload: any = null;
      let remoteConversation: Conversation | null = null;
      const requestBody = {
        conversationId: conversation.id.startsWith(TEMP_PREFIX)
          ? undefined
          : conversation.id,
        message: trimmed,
      };
      const sendAsNewConversation = async () => {
        const response = await api.post("/reports/chat", {
          conversationId: undefined,
          message: trimmed,
        });

        payload = response.data?.data;
        remoteConversation = {
          id: payload.conversation.id,
          title: payload.conversation.title,
          lastMessage: payload.conversation.lastMessage || "",
          messageCount: (optimisticConversation.messageCount || 0) + 1,
          createdAt: payload.conversation.createdAt,
          updatedAt: payload.conversation.updatedAt,
        };
      };

      try {
        const streamResult = await streamChatRequest({
          conversationId: requestBody.conversationId,
          message: trimmed,
          onConversation: (conversationData) => {
            if (!conversationData) {
              return;
            }

            remoteConversation = {
              id: conversationData.id,
              title: conversationData.title,
              lastMessage: conversationData.lastMessage || "",
              messageCount: (optimisticConversation.messageCount || 0) + 1,
              createdAt: conversationData.createdAt,
              updatedAt: conversationData.updatedAt,
            };
          },
          onChunk: (chunk) => {
            const normalizedChunk = String(chunk || "");
            if (!normalizedChunk) {
              return;
            }

            if (normalizedChunk === streamedChunks[streamedChunks.length - 1]) {
              return;
            }

            streamedChunks.push(normalizedChunk);
            streamedContent = mergeStreamChunk(streamedContent, normalizedChunk);

            set((state) => ({
              messages: state.messages.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: streamedContent,
                      status: "sending",
                      metadata: {
                        ...(message.metadata || {}),
                        chunks: [...streamedChunks],
                        streaming: true,
                      },
                    }
                  : message
              ),
            }));
          },
        });

        payload = {
          conversation: streamResult.conversation,
          message: streamResult.message,
        };
      } catch (streamError: any) {
        try {
          let response;
          try {
            response = await api.post("/reports/chat", requestBody);
          } catch (apiError: any) {
            if (
              requestBody.conversationId &&
              isRetryableConversationError(apiError, streamError?.status)
            ) {
              response = await api.post("/reports/chat", {
                conversationId: undefined,
                message: trimmed,
              });
            } else {
              throw apiError;
            }
          }

          payload = response.data?.data;
          remoteConversation = {
            id: payload.conversation.id,
            title: payload.conversation.title,
            lastMessage: payload.conversation.lastMessage || "",
            messageCount: (optimisticConversation.messageCount || 0) + 1,
            createdAt: payload.conversation.createdAt,
            updatedAt: payload.conversation.updatedAt,
          };
        } catch (apiError: any) {
          if (
            requestBody.conversationId &&
            isRetryableConversationError(apiError, streamError?.status)
          ) {
            await sendAsNewConversation();
          } else {
            throw apiError;
          }
        }
      }

      if (!remoteConversation && payload?.conversation) {
        remoteConversation = {
          id: payload.conversation.id,
          title: payload.conversation.title,
          lastMessage: payload.conversation.lastMessage || "",
          messageCount: (optimisticConversation.messageCount || 0) + 1,
          createdAt: payload.conversation.createdAt,
          updatedAt: payload.conversation.updatedAt,
        };
      }

      if (!remoteConversation) {
        throw new Error("Conversation sync failed");
      }
      const finalizedConversation = remoteConversation;

      if (conversation.id !== finalizedConversation.id) {
        await renameConversationLocal(conversation.id, finalizedConversation);
      } else {
        await upsertConversationLocal(finalizedConversation, 1);
      }

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        conversationId: finalizedConversation.id,
        role: "assistant",
        content: payload.message?.content || streamedContent,
        status: "sent",
        metadata: {
          source: payload.message?.source || "fallback",
          safeFallbackUsed: payload.message?.safeFallbackUsed ?? true,
          language: payload.message?.language,
          chunks: payload.message?.chunks || streamedChunks,
          streaming: false,
        },
        createdAt: payload.message?.createdAt || new Date().toISOString(),
      };

      await insertMessageLocal(
        {
          ...userMessage,
          conversationId: finalizedConversation.id,
          status: "sent",
        },
        1
      );
      await insertMessageLocal(assistantMessage, 1);

      const freshMessages = await getLocalMessages(finalizedConversation.id);

      set((state) => ({
        currentConversation: finalizedConversation,
        messages: dedupeMessages(freshMessages).map((message) => ({
          ...message,
          status: "sent",
        })),
        conversations: [
          finalizedConversation,
          ...state.conversations.filter(
            (item) =>
              item.id !== conversation.id && item.id !== finalizedConversation.id
          ),
        ],
        isSending: false,
        isStreaming: false,
      }));

      return { assistant: assistantMessage, conversationId: finalizedConversation.id };
    } catch (error) {
      console.error("Error sending chat message:", getApiErrorMessage(error));
      set({
        isSending: false,
        isStreaming: false,
        error: getApiErrorMessage(error),
        messages: get().messages.map((message) =>
          message.conversationId === activeConversationId &&
          (message.id === pendingUserMessageId ||
            message.id === pendingAssistantMessageId)
            ? {
                ...message,
                status: "failed",
                metadata: {
                  ...(message.metadata || {}),
                  streaming: false,
                },
              }
            : message
        ),
      });
      return { assistant: null };
    }
  },

  deleteConversation: async (id: string) => {
    try {
      if (!id.startsWith(TEMP_PREFIX)) {
        await api.delete(`/reports/chat/conversations/${id}`);
      }
      await deleteConversationLocal(id);
      set((state) => ({
        conversations: state.conversations.filter((item) => item.id !== id),
        currentConversation:
          state.currentConversation?.id === id ? null : state.currentConversation,
        messages: state.currentConversation?.id === id ? [] : state.messages,
      }));
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  },

  clearAllConversations: async () => {
    try {
      await api.delete("/reports/chat/conversations").catch(() => {});
      await clearAllConversationsLocal();
      set({
        conversations: [],
        currentConversation: null,
        messages: [],
        error: null,
      });
    } catch (error) {
      console.error("Error clearing conversations:", error);
    }
  },
}));
