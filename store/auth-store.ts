import api from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import {
  clearOfflineSession,
  clearSyncedProfileUpdates,
  getOfflineSession,
  getPendingProfileUpdates,
  markProfileUpdateSynced,
  queueProfileUpdate,
  saveOfflineCredentials,
  saveUserOffline,
  updateUserOffline,
  verifyOfflineCredentials,
} from "@/lib/offline-db";
import { showApiError, toast } from "@/lib/toast";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

// Types
export interface UserProfile {
  age?: number;
  sex?: "male" | "female" | "other";
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  diabetesType?: "type1" | "type2" | "prediabetes" | "unknown";
  activityLevel?: "low" | "moderate" | "high";
  allergies?: string[];
  incomeBracket?: "low" | "middle" | "high";
  language?: string;
  profileImage?: {
    public_id?: string;
    secure_url?: string;
  };
}

export interface User {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  role: "user" | "health_worker" | "admin";
  deleted?: boolean;
  profile?: UserProfile;
  consent?: {
    accepted: boolean;
    timestamp?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  profile?: Partial<UserProfile>;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  consent: {
    accepted: boolean;
    timestamp?: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  hasPendingUpdates: boolean;
  error: string | null;

  // Actions
  register: (data: RegisterData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  getProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  uploadPhoto: (imageUri: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  syncPendingUpdates: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  expiresAt: null,
  isLoading: false,
  isAuthenticated: false,
  isOffline: false,
  hasPendingUpdates: false,
  error: null,

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getDeviceId();
      const response = await api.post("/auth/register", {
        ...data,
        deviceId,
        consent: {
          ...data.consent,
          timestamp: new Date().toISOString(),
        },
      });

      const { user, token, expiresAt } = response.data.data;

      // Check if user is admin - block admin access
      if (user.role === "admin") {
        set({ isLoading: false });
        throw new Error(
          "Admin accounts cannot access the mobile app. Please login at https://gluvia.vercel.app"
        );
      }

      // Store in secure storage
      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("user", JSON.stringify(user));
      await SecureStore.setItemAsync("expiresAt", expiresAt);

      // Save for offline access
      await saveUserOffline(
        {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          deleted: user.deleted || false,
          profile: user.profile || { allergies: [] },
          consent: user.consent || { accepted: true },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
        expiresAt
      );

      // Save credentials for offline login
      await saveOfflineCredentials(user._id, data.email, data.password);

      set({
        user,
        token,
        expiresAt,
        isAuthenticated: true,
        isOffline: false,
        isLoading: false,
      });
    } catch (error: any) {
      const { message } = showApiError(
        error,
        "Registration failed. Please try again."
      );
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  login: async (data: LoginData) => {
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getDeviceId();
      const response = await api.post("/auth/login", {
        ...data,
        deviceId,
      });

      const { user, token, expiresAt } = response.data.data;

      // Check if user is admin - block admin access
      if (user.role === "admin") {
        set({ isLoading: false });
        throw new Error(
          "Admin accounts cannot access the mobile app. Please login at https://gluvia.vercel.app"
        );
      }

      // Store in secure storage
      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("user", JSON.stringify(user));
      await SecureStore.setItemAsync("expiresAt", expiresAt);

      // Save for offline access
      await saveUserOffline(
        {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          deleted: user.deleted || false,
          profile: user.profile || { allergies: [] },
          consent: user.consent || { accepted: true },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
        expiresAt
      );

      // Save credentials for offline login
      await saveOfflineCredentials(user._id, data.email, data.password);

      // Sync any pending profile updates
      get().syncPendingUpdates();

      set({
        user,
        token,
        expiresAt,
        isAuthenticated: true,
        isOffline: false,
        isLoading: false,
      });
    } catch (error: any) {
      // If network error, try offline login with credential verification
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        try {
          // Check if we have any offline session for this email
          const offlineSession = await getOfflineSession();

          if (!offlineSession || offlineSession.user.email !== data.email) {
            // No offline data for this account
            set({ isLoading: false });
            throw new Error(
              "You're offline and this account hasn't been used on this device before.\n\nPlease connect to the internet to log in for the first time. After that, you can use the app offline."
            );
          }

          // Verify credentials match stored credentials
          const isValidCredentials = await verifyOfflineCredentials(
            data.email,
            data.password
          );

          if (!isValidCredentials) {
            set({ isLoading: false });
            throw new Error(
              "Invalid password. Please check your password and try again."
            );
          }

          // Convert offline user to User format
          const user: User = {
            _id: offlineSession.user.id,
            email: offlineSession.user.email,
            name: offlineSession.user.name,
            phone: offlineSession.user.phone,
            role: offlineSession.user.role as User["role"],
            deleted: offlineSession.user.deleted,
            profile: offlineSession.user.profile,
            consent: offlineSession.user.consent,
            createdAt: offlineSession.user.createdAt,
            updatedAt: offlineSession.user.updatedAt,
          };

          toast.info("Offline Mode", "Logged in with cached credentials");

          set({
            user,
            token: offlineSession.token,
            expiresAt: offlineSession.expiresAt,
            isAuthenticated: true,
            isOffline: true,
            isLoading: false,
          });
          return;
        } catch (offlineError: any) {
          console.error("Offline login failed:", offlineError);
          set({ isLoading: false });
          throw offlineError;
        }
      }

      const message =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        "Invalid email or password.";
      showApiError(error, "Invalid email or password.");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      if (!get().isOffline) {
        const deviceId = await getDeviceId();
        await api.post("/auth/logout", { deviceId });
      }
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      // Clear secure storage
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("expiresAt");

      // Clear offline session
      await clearOfflineSession();

      set({
        user: null,
        token: null,
        expiresAt: null,
        isAuthenticated: false,
        isOffline: false,
        isLoading: false,
        error: null,
      });
    }
  },

  requestPasswordReset: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/password-reset-request", { email });
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
    }
  },

  getProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/auth/me");
      const { user } = response.data.data;

      await SecureStore.setItemAsync("user", JSON.stringify(user));

      // Update offline copy
      await saveUserOffline(
        {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          deleted: user.deleted || false,
          profile: user.profile || {},
          consent: user.consent || { accepted: true },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        get().token || "",
        get().expiresAt || ""
      );

      set({ user, isLoading: false, isOffline: false, error: null });
    } catch (error: any) {
      // If offline, use cached data - don't clear the user
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        toast.info("Offline Mode", "Using cached data");
        set({ isLoading: false, isOffline: true, error: null });
        return;
      }
      // For other errors, keep the existing user data but show error
      const { message } = showApiError(error, "Failed to get profile.");
      set({ error: message, isLoading: false });
      // Don't clear user data or throw - just set the error state
    }
  },

  updateProfile: async (data: UpdateProfileData) => {
    set({ isLoading: true, error: null });

    const currentUser = get().user;
    const isOffline = get().isOffline;

    // If offline, queue the update for later sync
    if (isOffline) {
      try {
        if (currentUser?._id) {
          // Queue update for later sync
          await queueProfileUpdate(currentUser._id, data);

          // Update local state immediately
          const updatedUser = {
            ...currentUser,
            name: data.name || currentUser.name,
            phone: data.phone || currentUser.phone,
            profile: {
              ...currentUser.profile,
              ...data.profile,
            },
          };

          // Update offline copy
          await updateUserOffline(currentUser._id, {
            name: updatedUser.name,
            phone: updatedUser.phone,
            profile: updatedUser.profile,
          });

          await SecureStore.setItemAsync("user", JSON.stringify(updatedUser));

          toast.info(
            "Saved Offline",
            "Your changes will sync when you're back online"
          );

          set({
            user: updatedUser,
            isLoading: false,
            hasPendingUpdates: true,
            error: null,
          });
        }
        return;
      } catch (error: any) {
        const message = "Failed to save offline. Please try again.";
        set({ error: message, isLoading: false });
        throw new Error(message);
      }
    }

    try {
      const response = await api.put("/auth/me", data);

      // Handle both response structures: response.data.data.user or response.data.user
      const user = response.data.data?.user || response.data.user;

      if (!user) {
        throw new Error("Invalid response structure from server");
      }

      await SecureStore.setItemAsync("user", JSON.stringify(user));

      // Update offline copy
      if (currentUser?._id) {
        await updateUserOffline(currentUser._id, {
          name: user.name,
          phone: user.phone,
          profile: user.profile,
        });
      }

      set({ user, isLoading: false, error: null });
    } catch (error: any) {
      // If network error, queue for offline sync
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        if (currentUser?._id) {
          await queueProfileUpdate(currentUser._id, data);

          // Update local state immediately
          const updatedUser = {
            ...currentUser,
            name: data.name || currentUser.name,
            phone: data.phone || currentUser.phone,
            profile: {
              ...currentUser.profile,
              ...data.profile,
            },
          };

          await updateUserOffline(currentUser._id, {
            name: updatedUser.name,
            phone: updatedUser.phone,
            profile: updatedUser.profile,
          });

          await SecureStore.setItemAsync("user", JSON.stringify(updatedUser));

          toast.info(
            "Saved Offline",
            "Your changes will sync when you're back online"
          );

          set({
            user: updatedUser,
            isLoading: false,
            isOffline: true,
            hasPendingUpdates: true,
            error: null,
          });
          return;
        }
      }

      const { message } = showApiError(error, "Failed to update profile.");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  uploadPhoto: async (imageUri: string) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      const filename = imageUri.split("/").pop() || "photo.jpg";
      const match = /\.([\w]+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("image", {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await api.post("/auth/upload-photo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const { profileImage } = response.data.data;

      // Update user with new profile image
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          profile: {
            ...currentUser.profile,
            profileImage,
          },
        };
        await SecureStore.setItemAsync("user", JSON.stringify(updatedUser));
        set({ user: updatedUser, isLoading: false, error: null });
      } else {
        set({ isLoading: false });
      }
    } catch (error: any) {
      const { message } = showApiError(error, "Failed to upload photo.");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.delete("/auth/delete-account");

      // Clear all local data
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("expiresAt");
      await clearOfflineSession();

      set({
        user: null,
        token: null,
        expiresAt: null,
        isAuthenticated: false,
        isOffline: false,
        isLoading: false,
        error: null,
      });
      toast.success(
        "Account Deleted",
        "Your account has been permanently deleted."
      );
    } catch (error: any) {
      const { message } = showApiError(error, "Failed to delete account.");
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  checkAuth: async () => {
    try {
      // First check secure storage
      const token = await SecureStore.getItemAsync("authToken");
      const userStr = await SecureStore.getItemAsync("user");
      const expiresAt = await SecureStore.getItemAsync("expiresAt");

      if (token && userStr) {
        // Check if token is expired
        if (expiresAt && new Date(expiresAt) < new Date()) {
          await get().logout();
          return false;
        }

        const user = JSON.parse(userStr);

        // Block admin access
        if (user.role === "admin") {
          await get().logout();
          return false;
        }

        set({
          user,
          token,
          expiresAt,
          isAuthenticated: true,
          isOffline: false,
        });
        return true;
      }

      // Try offline session
      const offlineSession = await getOfflineSession();
      if (offlineSession) {
        // Block admin access
        if (offlineSession.user.role === "admin") {
          await clearOfflineSession();
          return false;
        }

        const user: User = {
          _id: offlineSession.user.id,
          email: offlineSession.user.email,
          name: offlineSession.user.name,
          phone: offlineSession.user.phone,
          role: offlineSession.user.role as User["role"],
          deleted: offlineSession.user.deleted,
          profile: offlineSession.user.profile,
          consent: offlineSession.user.consent,
          createdAt: offlineSession.user.createdAt,
          updatedAt: offlineSession.user.updatedAt,
        };

        set({
          user,
          token: offlineSession.token,
          expiresAt: offlineSession.expiresAt,
          isAuthenticated: true,
          isOffline: true,
        });
        return true;
      }

      set({ isAuthenticated: false });
      return false;
    } catch (error) {
      console.error("Auth check failed:", error);
      set({ isAuthenticated: false });
      return false;
    }
  },

  syncPendingUpdates: async () => {
    try {
      const currentUser = get().user;
      if (!currentUser?._id) return;

      const pendingUpdates = await getPendingProfileUpdates(currentUser._id);
      if (pendingUpdates.length === 0) {
        set({ hasPendingUpdates: false });
        return;
      }

      // Merge all pending updates
      let mergedData: UpdateProfileData = {};
      for (const update of pendingUpdates) {
        mergedData = {
          ...mergedData,
          ...update.updateData,
          profile: {
            ...mergedData.profile,
            ...update.updateData.profile,
          },
        };
      }

      // Try to sync with server
      const response = await api.put("/auth/me", mergedData);
      const user = response.data.data?.user || response.data.user;

      if (user) {
        // Mark all updates as synced
        for (const update of pendingUpdates) {
          await markProfileUpdateSynced(update.id);
        }

        // Clear synced updates
        await clearSyncedProfileUpdates();

        // Update local state
        await SecureStore.setItemAsync("user", JSON.stringify(user));
        await updateUserOffline(currentUser._id, {
          name: user.name,
          phone: user.phone,
          profile: user.profile,
        });

        toast.success("Synced", "Your profile changes have been saved");
        set({ user, hasPendingUpdates: false, isOffline: false });
      }
    } catch (error: any) {
      // Silently fail if still offline
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        return;
      }
      console.error("Failed to sync pending updates:", error);
    }
  },

  clearError: () => set({ error: null }),
}));
