import type { User } from "@/store/auth-store";

const REQUIRED_PROFILE_FIELDS = [
  "diabetesType",
  "age",
  "sex",
  "heightCm",
  "weightKg",
  "activityLevel",
  "incomeBracket",
  "language",
] as const;

export const getMissingProfileFields = (user: User | null | undefined) => {
  const profile = user?.profile || {};

  return REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = profile[field];
    return value === undefined || value === null || value === "";
  });
};

export const isProfileComplete = (user: User | null | undefined) =>
  getMissingProfileFields(user).length === 0;
