import { Alert } from "react-native";

interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
}

// Simple toast using Alert - works everywhere without native modules
export const toast = {
  success: (title: string, message?: string) => {
    Alert.alert(title, message);
  },

  error: (title: string, message?: string) => {
    Alert.alert(title, message);
  },

  info: (title: string, message?: string) => {
    Alert.alert(title, message);
  },

  custom: (options: ToastOptions) => {
    Alert.alert(options.title, options.message);
  },
};

// Helper to parse API errors and show appropriate toast
export const showApiError = (error: any, fallbackMessage?: string) => {
  const status = error.response?.status;
  const apiMessage =
    error.response?.data?.message || error.response?.data?.error?.message;

  let title = "Error";
  let message = fallbackMessage || "Something went wrong";

  switch (status) {
    case 400:
      title = "Invalid Request";
      message = apiMessage || "Please check your input and try again.";
      break;
    case 401: {
      const errorCode = error.response?.data?.error?.code;
      title =
        errorCode === "TOKEN_REVOKED" || errorCode === "INVALID_TOKEN"
          ? "Session Expired"
          : "Invalid Credentials";
      message =
        errorCode === "TOKEN_REVOKED" || errorCode === "INVALID_TOKEN"
          ? "Your session has expired. Please log in again."
          : apiMessage || "Please check your email and password.";
      break;
    }
    case 403:
      title = "Access Denied";
      message = apiMessage || "You don't have permission to do this.";
      break;
    case 404:
      title = "Not Found";
      message = apiMessage || "The requested resource was not found.";
      break;
    case 409:
      title = "Conflict";
      message = apiMessage || "This action conflicts with existing data.";
      break;
    case 422:
      title = "Validation Error";
      message = apiMessage || "Please check your input.";
      break;
    case 429:
      title = "Too Many Requests";
      message = "Please wait a moment and try again.";
      break;
    case 500:
    case 502:
    case 503:
      title = "Server Error";
      message =
        apiMessage || "Our servers are having issues. Please try again later.";
      break;
    default:
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        title = "No Connection";
        message = "Please check your internet connection.";
      } else if (apiMessage) {
        message = apiMessage;
      } else if (error.message) {
        message = error.message;
      }
  }

  toast.error(title, message);
  return { title, message };
};
