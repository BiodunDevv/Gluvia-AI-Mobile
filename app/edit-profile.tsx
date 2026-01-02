import { Button, Dropdown, FormField } from "@/components/ui";
import { useAuthStore, UserProfile } from "@/store/auth-store";
import { router } from "expo-router";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  Globe,
  Heart,
  Phone,
  Ruler,
  Scale,
  User as UserIcon,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DIABETES_TYPES = [
  { value: "type1", label: "Type 1" },
  { value: "type2", label: "Type 2" },
  { value: "prediabetes", label: "Prediabetes" },
  { value: "unknown", label: "Unknown" },
];

const ACTIVITY_LEVELS = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

const INCOME_BRACKETS = [
  { value: "low", label: "Low" },
  { value: "middle", label: "Middle" },
  { value: "high", label: "High" },
];

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "yoruba", label: "Yoruba" },
  { value: "hausa", label: "Hausa" },
  { value: "igbo", label: "Igbo" },
];

export default function EditProfileScreen() {
  const { user, updateProfile, isLoading } = useAuthStore();

  // Basic Info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Profile Info
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [diabetesType, setDiabetesType] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [incomeBracket, setIncomeBracket] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setAge(user.profile?.age?.toString() || "");
      setSex(user.profile?.sex || "");
      setHeightCm(user.profile?.heightCm?.toString() || "");
      setWeightKg(user.profile?.weightKg?.toString() || "");
      setDiabetesType(user.profile?.diabetesType || "");
      setActivityLevel(user.profile?.activityLevel || "");
      setAllergies(user.profile?.allergies || []);
      setIncomeBracket(user.profile?.incomeBracket || "");
      setLanguage(user.profile?.language || "");
    }
  }, [user]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const handleRemoveAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    try {
      const profileData: UserProfile = {};

      if (age) profileData.age = parseInt(age, 10);
      if (sex) profileData.sex = sex as "male" | "female" | "other";
      if (heightCm) profileData.heightCm = parseFloat(heightCm);
      if (weightKg) profileData.weightKg = parseFloat(weightKg);
      if (diabetesType)
        profileData.diabetesType = diabetesType as
          | "type1"
          | "type2"
          | "prediabetes"
          | "unknown";
      if (activityLevel)
        profileData.activityLevel = activityLevel as
          | "low"
          | "moderate"
          | "high";
      if (allergies.length > 0) profileData.allergies = allergies;
      if (incomeBracket)
        profileData.incomeBracket = incomeBracket as "low" | "middle" | "high";
      if (language) profileData.language = language;

      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        profile: Object.keys(profileData).length > 0 ? profileData : undefined,
      });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1">
            {/* Header */}
            <View className="px-4 py-4 border-b border-gray-100 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#374151" />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900">
                Edit Profile
              </Text>
              <Button
                variant="primary"
                size="sm"
                onPress={handleSave}
                loading={isLoading}
                fullWidth={false}
              >
                Save
              </Button>
            </View>

            <ScrollView
              className="flex-1 pb-10"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Basic Information */}
              <View className="px-6 py-5">
                <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Basic Information
                </Text>

                <FormField label="Full Name">
                  <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                    <UserIcon size={18} color="#9ca3af" />
                    <TextInput
                      className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="words"
                    />
                  </View>
                </FormField>

                <FormField label="Phone Number" optional>
                  <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                    <Phone size={18} color="#9ca3af" />
                    <TextInput
                      className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Enter your phone number"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                    />
                  </View>
                </FormField>

                {/* Email Note */}
                <View className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <Text className="text-xs text-blue-700">
                    <Text className="font-semibold">Email: </Text>
                    {user?.email}
                  </Text>
                </View>
              </View>

              {/* Personal Details */}
              <View className="px-6 py-5 border-t border-gray-100">
                <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Personal Details
                </Text>

                {/* Age & Sex Row */}
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <FormField label="Age">
                      <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                        <TextInput
                          className="flex-1 text-[15px] text-gray-900 text-center py-0"
                          value={age}
                          onChangeText={setAge}
                          placeholder="Years"
                          placeholderTextColor="#9ca3af"
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                      </View>
                    </FormField>
                  </View>

                  <View className="flex-1">
                    <FormField label="Sex">
                      <Dropdown
                        options={SEX_OPTIONS}
                        value={sex}
                        onChange={setSex}
                        placeholder="Select"
                      />
                    </FormField>
                  </View>
                </View>

                {/* Height & Weight Row */}
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormField label="Height (cm)">
                      <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                        <Ruler size={18} color="#9ca3af" />
                        <TextInput
                          className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                          value={heightCm}
                          onChangeText={setHeightCm}
                          placeholder="cm"
                          placeholderTextColor="#9ca3af"
                          keyboardType="decimal-pad"
                          maxLength={5}
                        />
                      </View>
                    </FormField>
                  </View>

                  <View className="flex-1">
                    <FormField label="Weight (kg)">
                      <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                        <Scale size={18} color="#9ca3af" />
                        <TextInput
                          className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                          value={weightKg}
                          onChangeText={setWeightKg}
                          placeholder="kg"
                          placeholderTextColor="#9ca3af"
                          keyboardType="decimal-pad"
                          maxLength={5}
                        />
                      </View>
                    </FormField>
                  </View>
                </View>
              </View>

              {/* Health Information */}
              <View className="px-6 py-5 border-t border-gray-100">
                <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Health Information
                </Text>

                <FormField label="Diabetes Type">
                  <Dropdown
                    options={DIABETES_TYPES}
                    value={diabetesType}
                    onChange={setDiabetesType}
                    placeholder="Select diabetes type"
                    icon={<Heart size={18} color="#9ca3af" />}
                  />
                </FormField>

                <FormField label="Activity Level">
                  <Dropdown
                    options={ACTIVITY_LEVELS}
                    value={activityLevel}
                    onChange={setActivityLevel}
                    placeholder="Select activity level"
                    icon={<Activity size={18} color="#9ca3af" />}
                  />
                </FormField>

                {/* Allergies */}
                <FormField label="Allergies">
                  <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200 mb-2">
                    <AlertCircle size={18} color="#9ca3af" />
                    <TextInput
                      className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                      value={newAllergy}
                      onChangeText={setNewAllergy}
                      placeholder="Add an allergy"
                      placeholderTextColor="#9ca3af"
                      returnKeyType="done"
                      onSubmitEditing={handleAddAllergy}
                    />
                    <TouchableOpacity
                      onPress={handleAddAllergy}
                      className="w-8 h-8 rounded-full bg-primary items-center justify-center"
                      activeOpacity={0.7}
                    >
                      <Text className="text-white text-lg font-medium">+</Text>
                    </TouchableOpacity>
                  </View>
                  {allergies.length > 0 && (
                    <View className="flex-row flex-wrap gap-2">
                      {allergies.map((allergy, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => handleRemoveAllergy(index)}
                          className="flex-row items-center px-3 py-2 bg-red-50 rounded-full border border-red-200"
                          activeOpacity={0.7}
                        >
                          <Text className="text-sm text-red-700 font-medium">
                            {allergy}
                          </Text>
                          <X size={14} color="#dc2626" className="ml-2" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </FormField>
              </View>

              {/* Preferences */}
              <View className="px-6 py-5 border-t border-gray-100">
                <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Preferences
                </Text>

                <FormField label="Income Bracket">
                  <Dropdown
                    options={INCOME_BRACKETS}
                    value={incomeBracket}
                    onChange={setIncomeBracket}
                    placeholder="Select income bracket"
                    icon={<DollarSign size={18} color="#9ca3af" />}
                  />
                </FormField>

                <FormField label="Preferred Language">
                  <Dropdown
                    options={LANGUAGE_OPTIONS}
                    value={language}
                    onChange={setLanguage}
                    placeholder="Select language"
                    icon={<Globe size={18} color="#9ca3af" />}
                  />
                </FormField>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
