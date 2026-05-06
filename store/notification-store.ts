import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { create } from "zustand";

export interface AppNotification {
  _id: string;
  type: "admin" | "system" | "meal" | "glucose" | "reminder";
  title: string;
  body: string;
  data?: Record<string, any>;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}

interface NotificationState {
  items: AppNotification[];
  current: AppNotification | null;
  meta: NotificationMeta | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  lastFetchedAt: string | null;
  fetchNotifications: (
    params?: { page?: number; limit?: number },
    options?: { silent?: boolean; force?: boolean; append?: boolean }
  ) => Promise<void>;
  fetchNotification: (id: string) => Promise<AppNotification | null>;
  markAsRead: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  current: null,
  meta: null,
  isLoading: false,
  isLoadingMore: false,
  lastFetchedAt: null,

  fetchNotifications: async (params = {}, options = {}) => {
    if (useAuthStore.getState().maintenanceMessage) {
      set({ isLoading: false, isLoadingMore: false });
      return;
    }

    const { silent = false, force = false, append = false } = options;
    const state = get();
    const isDefaultList = !params.page || params.page === 1;

    if (
      !force &&
      isDefaultList &&
      state.items.length > 0 &&
      state.lastFetchedAt &&
      Date.now() - new Date(state.lastFetchedAt).getTime() < 60_000
    ) {
      return;
    }

    if (!silent && append) {
      set({ isLoadingMore: true });
    } else if (!silent) {
      set({ isLoading: true });
    }

    try {
      const response = await api.get("/notifications", { params });
      const incoming = response.data.data || [];
      set({
        items: append
          ? [
              ...state.items,
              ...incoming.filter(
                (item: AppNotification) =>
                  !state.items.some((existing) => existing._id === item._id)
              ),
            ]
          : incoming,
        meta: response.data.meta || null,
        lastFetchedAt: new Date().toISOString(),
        isLoading: false,
        isLoadingMore: false,
      });
    } catch (error: any) {
      if (error?.response?.status !== 503) {
        console.error("Failed to fetch notifications:", error);
      }
      set({ isLoading: false, isLoadingMore: false });
    }
  },

  fetchNotification: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/notifications/${id}`);
      const notification = response.data.data || null;
      set((state) => ({
        current: notification,
        items: notification
          ? state.items.some((item) => item._id === notification._id)
            ? state.items.map((item) =>
                item._id === notification._id ? notification : item
              )
            : [notification, ...state.items]
          : state.items,
        isLoading: false,
      }));
      return notification;
    } catch (error) {
      console.error("Failed to fetch notification:", error);
      set({ isLoading: false });
      return null;
    }
  },

  markAsRead: async (id: string) => {
    const state = get();
    const existingItem = state.items.find((item) => item._id === id);
    const existingCurrent = state.current?._id === id ? state.current : null;
    const wasUnread = !(existingCurrent?.readAt || existingItem?.readAt);

    if (!wasUnread) {
      return;
    }

    try {
      const response = await api.post(`/notifications/${id}/read`);
      const updated = response.data.data;
      set((state) => ({
        current:
          state.current?._id === id ? updated || state.current : state.current,
        items: state.items.map((item) =>
          item._id === id ? { ...item, readAt: updated?.readAt || new Date().toISOString() } : item
        ),
        meta: state.meta
          ? {
              ...state.meta,
              unreadCount: Math.max(
                0,
                state.meta.unreadCount - (wasUnread ? 1 : 0)
              ),
            }
          : state.meta,
        lastFetchedAt: state.lastFetchedAt || new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },
}));
