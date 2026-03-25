import { User } from "@/store/auth-store";
import { Camera } from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface ProfileHeaderProps {
  user: User | null;
  showEditButton?: boolean;
  onPhotoPress?: () => void;
}

export function ProfileHeader({
  user,
  showEditButton = false,
  onPhotoPress,
}: ProfileHeaderProps) {
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "user":
        return {
          label: "Patient",
          color: "bg-blue-100",
          text: "text-blue-700",
        };
      default:
        return { label: "Member", color: "bg-gray-100", text: "text-gray-700" };
    }
  };

  const roleBadge = getRoleBadge(user?.role);

  return (
    <View className="items-center mb-6">
      {/* Avatar */}
      <View className="relative mb-4">
        {user?.profile?.profileImage?.secure_url ? (
          <Image
            source={{ uri: user.profile.profileImage.secure_url }}
            className="w-28 h-28 rounded-full"
          />
        ) : (
          <View className="w-28 h-28 rounded-full bg-primary items-center justify-center">
            <Text className="text-4xl font-bold text-white">
              {getInitials(user?.name)}
            </Text>
          </View>
        )}
        {showEditButton && (
          <TouchableOpacity
            className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white items-center justify-center border-2 border-gray-100"
            onPress={onPhotoPress}
            activeOpacity={0.8}
          >
            <Camera size={18} color="#1447e6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Name */}
      <Text className="text-2xl font-bold text-gray-900 mb-1">
        {user?.name || "User"}
      </Text>
      <Text className="text-base text-gray-500 mb-3">{user?.email}</Text>

      {/* Role Badge */}
      <View className={`px-4 py-1.5 rounded-full ${roleBadge.color}`}>
        <Text className={`text-sm font-semibold ${roleBadge.text}`}>
          {roleBadge.label}
        </Text>
      </View>
    </View>
  );
}
