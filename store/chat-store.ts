/**
 * Chat Store - Simplified for Meal Recommendation System
 *
 * This store now focuses on:
 * - Data sync status (foods & rules)
 * - Conversation history for backward compatibility
 * - Basic offline storage
 */

import { getCachedFoods, getCachedRules, getDatabase } from "@/lib/offline-db";
import { create } from "zustand";

// Types
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
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
  isDataSynced: boolean;

  // Data sync check
  checkDataSynced: () => Promise<boolean>;

  // Conversation management (for backward compatibility)
  loadConversations: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearAllConversations: () => Promise<void>;
}

// Database helpers
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

async function deleteConversationLocal(id: string) {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM chat_messages WHERE conversation_id = ?`, [
    id,
  ]);
  await db.runAsync(`DELETE FROM conversations WHERE id = ?`, [id]);
}

async function clearAllConversationsLocal() {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM chat_messages`);
  await db.runAsync(`DELETE FROM conversations`);
}

// Store
export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  isDataSynced: false,

  checkDataSynced: async () => {
    try {
      const foods = await getCachedFoods();
      const rules = await getCachedRules();
      const synced = foods.length > 0 && rules.length > 0;
      set({ isDataSynced: synced });
      return synced;
    } catch {
      set({ isDataSynced: false });
      return false;
    }
  },

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      await initChatTables();
      const localConversations = await getLocalConversations();
      set({ conversations: localConversations, isLoading: false });
    } catch (error) {
      console.error("Error loading conversations:", error);
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await deleteConversationLocal(id);

      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversation:
          state.currentConversation?.id === id
            ? null
            : state.currentConversation,
        messages: state.currentConversation?.id === id ? [] : state.messages,
      }));
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  },

  clearAllConversations: async () => {
    try {
      await clearAllConversationsLocal();
      set({
        conversations: [],
        currentConversation: null,
        messages: [],
      });
    } catch (error) {
      console.error("Error clearing conversations:", error);
    }
  },
}));
