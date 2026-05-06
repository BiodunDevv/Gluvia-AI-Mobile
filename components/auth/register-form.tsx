import { Button, FormField } from "@/components/ui";
import { T, useTranslation } from "@/hooks/use-translation";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { Href, router } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckSquare,
  Lock,
  Mail,
  Phone,
  Square,
  User,
} from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LegalModal } from "./legal-modal";
import { StepIndicator } from "./step-indicator";

const TOTAL_STEPS = 3;

interface RegisterFormProps {
  onStepChange?: (step: number) => void;
}

function PasswordRequirement({
  label,
  valid,
}: {
  label: string;
  valid: boolean;
}) {
  return (
    <View className="mr-3 mb-2 flex-row items-center">
      <View
        className={`h-5 w-5 items-center justify-center rounded-full ${
          valid ? "bg-emerald-500" : "bg-gray-200"
        }`}
      >
        {valid && <Check size={12} color="#fff" />}
      </View>
      <Text
        className={`ml-2 text-xs font-medium ${
          valid ? "text-emerald-700" : "text-gray-500"
        }`}
      >
        <T>{label}</T>
      </Text>
    </View>
  );
}

export function RegisterForm({ onStepChange }: RegisterFormProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { register, isLoading, clearError } = useAuthStore();

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const hasPasswordLength = password.length >= 8;
  const hasPasswordLetter = /[A-Za-z]/.test(password);
  const hasPasswordNumber = /\d/.test(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const isPasswordValid =
    hasPasswordLength && hasPasswordLetter && hasPasswordNumber;
  const canContinuePasswordStep = isPasswordValid && passwordsMatch;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(callback, 110);
  };

  const handleNextStep = () => {
    Keyboard.dismiss();

    // Validate current step
    if (currentStep === 1) {
      if (!name.trim()) {
        toast.error("Missing Information", "Please enter your full name");
        return;
      }
      if (!email.trim()) {
        toast.error("Missing Information", "Please enter your email address");
        return;
      }
      if (!validateEmail(email)) {
        toast.error("Invalid Email", "Please enter a valid email address");
        return;
      }
    } else if (currentStep === 2) {
      if (!password) {
        toast.error("Missing Information", "Please create a password");
        return;
      }
      if (!isPasswordValid) {
        toast.error(
          "Weak Password",
          "Use at least 8 characters with one letter and one number"
        );
        return;
      }
      if (!passwordsMatch) {
        toast.error(
          "Password Mismatch",
          "The passwords you entered don't match"
        );
        return;
      }
    }

    if (currentStep < TOTAL_STEPS) {
      const newStep = currentStep + 1;
      animateTransition(() => {
        setCurrentStep(newStep);
        onStepChange?.(newStep);
        if (newStep === 2) {
          setTimeout(() => phoneInputRef.current?.focus(), 80);
        }
      });
    }
  };

  const handlePreviousStep = () => {
    Keyboard.dismiss();
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      animateTransition(() => {
        setCurrentStep(newStep);
        onStepChange?.(newStep);
      });
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();

    if (!consentAccepted) {
      toast.error(
        "Agreement Required",
        "Please accept the Terms of Service and Privacy Policy to continue"
      );
      return;
    }

    try {
      clearError();
      await register({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
        consent: {
          accepted: true,
        },
      });
      router.replace("/current-user" as Href);
    } catch {
      // Error is already handled by the store with toast
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Create your account";
      case 2:
        return "Secure your account";
      case 3:
        return "Almost there";
      default:
        return "";
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1:
        return "Add the details you will use to sign in.";
      case 2:
        return "Use at least 8 characters with one letter and one number.";
      case 3:
        return "Confirm your details and finish securely.";
      default:
        return "";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Name Input */}
            <FormField label={t("Full Name")} className="mb-4">
              <View className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5">
                <User size={18} color="#71717b" />
                <TextInput
                  className="flex-1 ml-2.5 text-sm text-gray-900 py-0"
                  placeholder={t("Enter your full name")}
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
              </View>
            </FormField>

            {/* Email Input */}
            <FormField label={t("Email Address")} className="mb-4">
              <View className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5">
                <Mail size={18} color="#71717b" />
                <TextInput
                  ref={emailInputRef}
                  className="flex-1 ml-2.5 text-sm text-gray-900 py-0"
                  placeholder={t("Enter your email")}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={handleNextStep}
                />
              </View>
            </FormField>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Phone Input (Optional) */}
            <FormField label={t("Phone Number")} optional className="mb-4">
              <View className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5">
                <Phone size={18} color="#71717b" />
                <TextInput
                  ref={phoneInputRef}
                  className="flex-1 ml-2.5 text-sm text-gray-900 py-0"
                  placeholder={t("Enter your phone number")}
                  placeholderTextColor="#9ca3af"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>
            </FormField>

            {/* Password Input */}
            <FormField label={t("Password")} className="mb-4">
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => passwordInputRef.current?.focus()}
                className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5"
              >
                <Lock size={18} color="#71717b" />
                <TextInput
                  ref={passwordInputRef}
                  className="flex-1 ml-2.5 text-sm text-gray-900 py-0"
                  placeholder={t("Example: moloman12")}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                />
              </TouchableOpacity>
            </FormField>

            <View className="mb-4 flex-row flex-wrap rounded-xl bg-gray-50 px-3 py-3">
              <PasswordRequirement label="8+ characters" valid={hasPasswordLength} />
              <PasswordRequirement label="Contains a letter" valid={hasPasswordLetter} />
              <PasswordRequirement label="Contains a number" valid={hasPasswordNumber} />
              <PasswordRequirement label="Passwords match" valid={passwordsMatch} />
            </View>

            {/* Confirm Password Input */}
            <FormField label={t("Confirm Password")} className="mb-4">
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => confirmPasswordInputRef.current?.focus()}
                className="h-12 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3.5"
              >
                <Lock size={18} color="#71717b" />
                <TextInput
                  ref={confirmPasswordInputRef}
                  className="flex-1 ml-2.5 text-sm text-gray-900 py-0"
                  placeholder={t("Re-enter your password")}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (canContinuePasswordStep) handleNextStep();
                  }}
                />
              </TouchableOpacity>
            </FormField>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Review Card */}
            <View className="mb-5 rounded-2xl bg-gray-50 p-5">
              <Text className="text-sm font-semibold text-gray-900 mb-3">
                <T>Account Details</T>
              </Text>
              <View className="space-y-2">
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-gray-500">
                    <T>Name</T>
                  </Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {name}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-gray-500">
                    <T>Email</T>
                  </Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {email}
                  </Text>
                </View>
                {phone && (
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-sm text-gray-500">
                      <T>Phone</T>
                    </Text>
                    <Text className="text-sm font-medium text-gray-900">
                      {phone}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Terms & Privacy Agreement */}
            <TouchableOpacity
              className="mb-5 flex-row items-start"
              onPress={() => setConsentAccepted(!consentAccepted)}
              activeOpacity={0.7}
            >
              <View className="mt-0.5 mr-3">
                {consentAccepted ? (
                  <CheckSquare size={22} color="#1447e6" />
                ) : (
                  <Square size={22} color="#9ca3af" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-700 leading-5">
                  <T>I agree to the</T>{" "}
                  <Text
                    className="text-primary font-semibold"
                    onPress={() => setShowTermsModal(true)}
                  >
                    <T>Terms of Service</T>
                  </Text>{" "}
                  <T>and</T>{" "}
                  <Text
                    className="text-primary font-semibold"
                    onPress={() => setShowPrivacyModal(true)}
                  >
                    <T>Privacy Policy</T>
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* Data Usage Notice */}
            <View className="mb-4 rounded-xl bg-primary/5 p-4">
              <Text className="text-xs text-gray-600 leading-5">
                <T>
                  Your health data is encrypted and stored securely. We never
                  share your personal information without your explicit consent.
                </T>
              </Text>
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <>
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View className="pt-1">
        <StepIndicator
          currentStep={currentStep}
          currentLabel={getStepTitle()}
          totalSteps={TOTAL_STEPS}
        />

        <View className="mb-4">
          <Text className="text-sm leading-5 text-gray-500">
            <T>{getStepSubtitle()}</T>
          </Text>
        </View>

        {renderStepContent()}

        {/* Action buttons flow right after step content */}
        <View
          className={`flex-row gap-3 mt-6 ${
            currentStep === 1 ? "" : "justify-between"
          }`}
        >
          {currentStep > 1 && (
            <Button
              variant="secondary"
              onPress={handlePreviousStep}
              className="flex-1"
              icon={<ArrowLeft size={18} color="#374151" />}
              iconPosition="left"
            >
              <T>Back</T>
            </Button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <Button
              onPress={handleNextStep}
              disabled={currentStep === 2 && !canContinuePasswordStep}
              className="flex-1"
              icon={<ArrowRight size={18} color="#ffffff" />}
              iconPosition="right"
            >
              <T>Continue</T>
            </Button>
          ) : (
            <Button
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading || !consentAccepted}
              className="flex-1"
            >
              <T>Create Account</T>
            </Button>
          )}
        </View>
      </View>

    </ScrollView>

    {/* Modals rendered outside scroll so they overlay the full screen */}
    <LegalModal
      visible={showTermsModal}
      onClose={() => setShowTermsModal(false)}
      type="terms"
    />
    <LegalModal
      visible={showPrivacyModal}
      onClose={() => setShowPrivacyModal(false)}
      type="privacy"
    />
    </>
  );
}
