import {
  ProfileOption,
  ProfileOptionSheet,
} from "@/components/profile/profile-option-sheet";
import { Button } from "@/components/ui";
import { useKeyboardBottomOffset } from "@/hooks/use-keyboard-visible";
import { cmToFeetInches, feetInchesToCm, parseNumber } from "@/lib/height";
import { useAuthStore, UserProfile } from "@/store/auth-store";
import { Href, router } from "expo-router";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  HeartPulse,
  Phone,
  Plus,
  Ruler,
  Scale,
  User,
  Users,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DIABETES_TYPES: ProfileOption[] = [
  {
    value: "type1",
    label: "Type 1 diabetes",
    description: "Insulin-dependent diabetes.",
  },
  {
    value: "type2",
    label: "Type 2 diabetes",
    description: "Lifestyle, medication, or insulin managed.",
  },
  {
    value: "prediabetes",
    label: "Prediabetes",
    description: "Higher than normal glucose levels.",
  },
  {
    value: "unknown",
    label: "Not sure",
    description: "Use this if you have not confirmed your type.",
  },
];

const SEX_OPTIONS: ProfileOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Prefer to self-describe" },
];

const ACTIVITY_LEVELS: ProfileOption[] = [
  {
    value: "low",
    label: "Light activity",
    description: "Mostly sitting, with light walking or chores.",
  },
  {
    value: "moderate",
    label: "Moderate activity",
    description: "Regular walking, active work, or planned exercise.",
  },
  {
    value: "high",
    label: "High activity",
    description: "Frequent training, labor-intensive work, or sports.",
  },
];

const INCOME_BRACKETS: ProfileOption[] = [
  {
    value: "low",
    label: "Budget-conscious",
    description: "Prioritize affordable meal options.",
  },
  {
    value: "middle",
    label: "Moderate budget",
    description: "Balance affordability with variety.",
  },
  {
    value: "high",
    label: "Flexible budget",
    description: "More room for premium or specialty foods.",
  },
];

type SheetKey = "sex" | "diabetes" | "activity" | "income" | null;
type HeightMode = "imperial" | "metric";

const handleBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.dismiss();
  }
};

function getOptionLabel(options: ProfileOption[], value: string) {
  return options.find((option) => option.value === value)?.label || "Not set";
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <Text className="text-base font-bold text-gray-900">{title}</Text>
      {description ? (
        <Text className="mt-1 text-sm leading-5 text-gray-500">
          {description}
        </Text>
      ) : null}
      <View className="mt-3 gap-3">{children}</View>
    </View>
  );
}

function FieldShell({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-[13px] font-semibold text-gray-700">
        {label}
      </Text>
      <View className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5">
        {icon ? <View className="mr-2.5">{icon}</View> : null}
        {children}
      </View>
    </View>
  );
}

function CompactInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  maxLength,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad" | "phone-pad";
  maxLength?: number;
}) {
  return (
    <TextInput
      className="flex-1 py-0 text-sm text-gray-900"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType}
      maxLength={maxLength}
    />
  );
}

function SelectionButton({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <FieldShell label={label} icon={icon}>
        <Text
          className={`flex-1 text-sm ${
            value === "Not set" ? "text-gray-400" : "text-gray-900"
          }`}
        >
          {value}
        </Text>
      </FieldShell>
    </TouchableOpacity>
  );
}

export default function EditProfileScreen() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const keyboardBottomOffset = useKeyboardBottomOffset();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [heightMode, setHeightMode] = useState<HeightMode>("imperial");
  const [heightCm, setHeightCm] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [diabetesType, setDiabetesType] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [incomeBracket, setIncomeBracket] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [activeSheet, setActiveSheet] = useState<SheetKey>(null);

  useEffect(() => {
    if (!user) return;

    const storedHeight = user.profile?.heightCm;
    const imperial = cmToFeetInches(storedHeight);

    setName(user.name || "");
    setPhone(user.phone || "");
    setAge(user.profile?.age?.toString() || "");
    setSex(user.profile?.sex || "");
    setHeightCm(storedHeight?.toString() || "");
    setHeightFeet(imperial.feet);
    setHeightInches(imperial.inches);
    setWeightKg(user.profile?.weightKg?.toString() || "");
    setDiabetesType(user.profile?.diabetesType || "");
    setActivityLevel(user.profile?.activityLevel || "");
    setIncomeBracket(user.profile?.incomeBracket || "");
    setAllergies(user.profile?.allergies || []);
  }, [user]);

  const activeSheetConfig = useMemo(() => {
    switch (activeSheet) {
      case "sex":
        return {
          title: "Sex",
          description: "Used for safer profile-based recommendations.",
          options: SEX_OPTIONS,
          value: sex,
          onSelect: setSex,
        };
      case "diabetes":
        return {
          title: "Diabetes type",
          description: "Choose the option that best matches your diagnosis.",
          options: DIABETES_TYPES,
          value: diabetesType,
          onSelect: setDiabetesType,
        };
      case "activity":
        return {
          title: "Activity level",
          description: "This helps estimate your daily nutrition needs.",
          options: ACTIVITY_LEVELS,
          value: activityLevel,
          onSelect: setActivityLevel,
        };
      case "income":
        return {
          title: "Food budget preference",
          description: "Used to make recommendations practical for your budget.",
          options: INCOME_BRACKETS,
          value: incomeBracket,
          onSelect: setIncomeBracket,
        };
      default:
        return null;
    }
  }, [activeSheet, activityLevel, diabetesType, incomeBracket, sex]);

  const handleAddAllergy = () => {
    const trimmed = newAllergy.trim();
    if (!trimmed || allergies.includes(trimmed)) return;
    setAllergies([...allergies, trimmed]);
    setNewAllergy("");
  };

  const handleRemoveAllergy = (index: number) => {
    setAllergies(allergies.filter((_, itemIndex) => itemIndex !== index));
  };

  const getHeightForSave = () => {
    if (heightMode === "metric") {
      return parseNumber(heightCm);
    }

    return feetInchesToCm(heightFeet, heightInches);
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your full name.");
      return;
    }

    const parsedHeight = getHeightForSave();
    const parsedAge = parseNumber(age);
    const parsedWeight = parseNumber(weightKg);
    const profileData: UserProfile = {};

    if (parsedAge !== null) profileData.age = Math.round(parsedAge);
    if (sex) profileData.sex = sex as UserProfile["sex"];
    if (parsedHeight !== null) profileData.heightCm = parsedHeight;
    if (parsedWeight !== null) profileData.weightKg = parsedWeight;
    if (diabetesType)
      profileData.diabetesType = diabetesType as UserProfile["diabetesType"];
    if (activityLevel)
      profileData.activityLevel = activityLevel as UserProfile["activityLevel"];
    if (incomeBracket)
      profileData.incomeBracket = incomeBracket as UserProfile["incomeBracket"];
    profileData.allergies = allergies;

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        profile: profileData,
      });

      router.replace("/(tabs)/profile" as Href);
    } catch (error: any) {
      Alert.alert("Update failed", error.message || "Failed to update profile.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <TouchableOpacity
          onPress={handleBack}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#374151" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-base font-bold text-gray-900">
            Update profile
          </Text>
          <Text className="text-xs text-gray-400">Keep recommendations safe</Text>
        </View>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormSection
          title="Account"
          description="Your basic account details stay private and secure."
        >
          <FieldShell label="Full name" icon={<User size={18} color="#9ca3af" />}>
            <CompactInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
            />
          </FieldShell>
          <FieldShell
            label="Phone number"
            icon={<Phone size={18} color="#9ca3af" />}
          >
            <CompactInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </FieldShell>
          <View className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <Text className="text-xs font-semibold text-blue-700">Email</Text>
            <Text className="mt-1 text-sm text-blue-900">
              {user?.email || "Not set"}
            </Text>
          </View>
        </FormSection>

        <FormSection
          title="Body details"
          description="Used to personalize meal guidance and daily ranges."
        >
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FieldShell label="Age">
                <CompactInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="Years"
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </FieldShell>
            </View>
            <View className="flex-1">
              <SelectionButton
                label="Sex"
                value={getOptionLabel(SEX_OPTIONS, sex)}
                onPress={() => setActiveSheet("sex")}
                icon={<Users size={18} color="#9ca3af" />}
              />
            </View>
          </View>

          <View>
            <Text className="mb-2 text-[13px] font-semibold text-gray-700">
              Height
            </Text>
            <View className="mb-3 flex-row rounded-xl bg-gray-100 p-1">
              {(["imperial", "metric"] as HeightMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setHeightMode(mode)}
                  className={`h-9 flex-1 items-center justify-center rounded-lg ${
                    heightMode === mode ? "bg-white" : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      heightMode === mode ? "text-primary" : "text-gray-500"
                    }`}
                  >
                    {mode === "imperial" ? "ft / in" : "cm"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {heightMode === "imperial" ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FieldShell label="Feet" icon={<Ruler size={18} color="#9ca3af" />}>
                    <CompactInput
                      value={heightFeet}
                      onChangeText={setHeightFeet}
                      placeholder="6"
                      keyboardType="number-pad"
                      maxLength={1}
                    />
                  </FieldShell>
                </View>
                <View className="flex-1">
                  <FieldShell label="Inches">
                    <CompactInput
                      value={heightInches}
                      onChangeText={setHeightInches}
                      placeholder="4"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </FieldShell>
                </View>
              </View>
            ) : (
              <FieldShell label="Centimeters" icon={<Ruler size={18} color="#9ca3af" />}>
                <CompactInput
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="193"
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
              </FieldShell>
            )}
          </View>

          <FieldShell label="Weight (kg)" icon={<Scale size={18} color="#9ca3af" />}>
            <CompactInput
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="Enter weight"
              keyboardType="decimal-pad"
              maxLength={5}
            />
          </FieldShell>
        </FormSection>

        <FormSection
          title="Health"
          description="These details help Gluvia tailor safer suggestions."
        >
          <SelectionButton
            label="Diabetes type"
            value={getOptionLabel(DIABETES_TYPES, diabetesType)}
            onPress={() => setActiveSheet("diabetes")}
            icon={<HeartPulse size={18} color="#9ca3af" />}
          />
          <SelectionButton
            label="Activity level"
            value={getOptionLabel(ACTIVITY_LEVELS, activityLevel)}
            onPress={() => setActiveSheet("activity")}
            icon={<Activity size={18} color="#9ca3af" />}
          />
        </FormSection>

        <FormSection
          title="Lifestyle"
          description="Use neutral preferences to keep recommendations practical."
        >
          <SelectionButton
            label="Food budget preference"
            value={getOptionLabel(INCOME_BRACKETS, incomeBracket)}
            onPress={() => setActiveSheet("income")}
            icon={<BriefcaseBusiness size={18} color="#9ca3af" />}
          />
        </FormSection>

        <FormSection
          title="Allergies"
          description="Add foods or ingredients you need Gluvia to avoid."
        >
          <FieldShell
            label="Add allergy"
            icon={<AlertCircle size={18} color="#9ca3af" />}
          >
            <CompactInput
              value={newAllergy}
              onChangeText={setNewAllergy}
              placeholder="e.g. peanuts"
            />
            <TouchableOpacity
              onPress={handleAddAllergy}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary"
            >
              <Plus size={17} color="#ffffff" />
            </TouchableOpacity>
          </FieldShell>
          {allergies.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {allergies.map((allergy, index) => (
                <TouchableOpacity
                  key={`${allergy}-${index}`}
                  onPress={() => handleRemoveAllergy(index)}
                  className="flex-row items-center rounded-full border border-red-100 bg-red-50 px-3 py-2"
                >
                  <Text className="text-sm font-medium text-red-700">
                    {allergy}
                  </Text>
                  <X size={14} color="#dc2626" className="ml-2" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-row items-center rounded-2xl border border-gray-100 bg-white px-4 py-3">
              <Check size={17} color="#10b981" />
              <Text className="ml-2 text-sm text-gray-500">
                No allergies added yet.
              </Text>
            </View>
          )}
        </FormSection>
      </ScrollView>

      <SafeAreaView
        edges={["bottom"]}
        className="border-t border-gray-100 bg-white px-4 pt-3"
        style={{ marginBottom: keyboardBottomOffset }}
      >
        <Button onPress={handleSave} loading={isLoading} disabled={isLoading}>
          Save changes
        </Button>
      </SafeAreaView>

      {activeSheetConfig ? (
        <ProfileOptionSheet
          visible={Boolean(activeSheet)}
          title={activeSheetConfig.title}
          description={activeSheetConfig.description}
          options={activeSheetConfig.options}
          value={activeSheetConfig.value}
          onSelect={activeSheetConfig.onSelect}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
