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
  Eye,
  EyeOff,
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LegalModal } from "./legal-modal";
import { StepIndicator } from "./step-indicator";

const TOTAL_STEPS = 3;

interface RegisterFormProps {
  onStepChange?: (step: number) => void;
}

export function RegisterForm({ onStepChange }: RegisterFormProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { register, isLoading, clearError } = useAuthStore();

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(callback, 150);
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
      if (password.length < 8) {
        toast.error(
          "Weak Password",
          "Password must be at least 8 characters long"
        );
        return;
      }
      if (password !== confirmPassword) {
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
        return "Let's get started";
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
        return "Tell us a bit about yourself";
      case 2:
        return "Create a strong password";
      case 3:
        return "Review and accept our terms";
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
              <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                <User size={20} color="#71717b" />
                <TextInput
                  className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                  placeholder={t("Enter your full name")}
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                />
              </View>
            </FormField>

            {/* Email Input */}
            <FormField label={t("Email Address")} className="mb-4">
              <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                <Mail size={20} color="#71717b" />
                <TextInput
                  className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                  placeholder={t("Enter your email")}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="done"
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
              <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                <Phone size={20} color="#71717b" />
                <TextInput
                  className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                  placeholder={t("Enter your phone number")}
                  placeholderTextColor="#9ca3af"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  returnKeyType="next"
                />
              </View>
            </FormField>

            {/* Password Input */}
            <FormField label={t("Password")} className="mb-4">
              <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                <Lock size={20} color="#71717b" />
                <TextInput
                  className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                  placeholder={t("Minimum 8 characters")}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="ml-2"
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#71717b" />
                  ) : (
                    <Eye size={20} color="#71717b" />
                  )}
                </TouchableOpacity>
              </View>
            </FormField>

            {/* Password Requirements */}
            <View className="flex-row items-center mb-4">
              <View
                className={`w-5 h-5 rounded-full items-center justify-center ${
                  password.length >= 8 ? "bg-green-500" : "bg-gray-200"
                }`}
              >
                {password.length >= 8 && <Check size={12} color="#fff" />}
              </View>
              <Text
                className={`ml-2 text-sm ${
                  password.length >= 8 ? "text-green-600" : "text-gray-500"
                }`}
              >
                <T>At least 8 characters</T>
              </Text>
            </View>

            {/* Confirm Password Input */}
            <FormField label={t("Confirm Password")} className="mb-4">
              <View className="flex-row items-center h-[52px] px-4 bg-gray-50 rounded-xl border border-gray-200">
                <Lock size={20} color="#71717b" />
                <TextInput
                  className="flex-1 ml-3 text-[15px] text-gray-900 py-0"
                  placeholder={t("Re-enter your password")}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="ml-2"
                  activeOpacity={0.7}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#71717b" />
                  ) : (
                    <Eye size={20} color="#71717b" />
                  )}
                </TouchableOpacity>
              </View>
            </FormField>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Review Card */}
            <View className="bg-gray-50 rounded-2xl p-5 mb-6">
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
              className="flex-row items-start mb-6"
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
            <View className="bg-primary/5 rounded-xl p-4 mb-4">
              <Text className="text-xs text-gray-600 leading-5">
                <T>
                  🔒 Your health data is encrypted and stored securely. We never
                  share your personal information with third parties without your
                  explicit consent.
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
    <View className="flex-1">
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Title */}
      <View className="mb-8">
        <Text className="text-[32px] font-bold text-gray-900 mb-2 tracking-tight">
          <T>{getStepTitle()}</T>
        </Text>
        <Text className="text-base text-gray-500 leading-6">
          <T>{getStepSubtitle()}</T>
        </Text>
      </View>

      {/* Step Content */}
      <View className="flex-1">{renderStepContent()}</View>

      {/* Navigation Buttons */}
      <View
        className={`flex-row gap-3 ${currentStep === 1 ? "" : "justify-between"}`}
      >
        {currentStep > 1 && (
          <Button
            variant="secondary"
            onPress={handlePreviousStep}
            className="flex-1"
            icon={<ArrowLeft size={20} color="#374151" />}
            iconPosition="left"
          >
            <T>Back</T>
          </Button>
        )}

        {currentStep < TOTAL_STEPS ? (
          <Button
            onPress={handleNextStep}
            className="flex-1"
            icon={<ArrowRight size={20} color="#ffffff" />}
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

      {/* Legal Modals */}
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
    </View>
  );
}
