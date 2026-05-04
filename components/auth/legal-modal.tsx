import { X } from "lucide-react-native";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  type: "terms" | "privacy";
}

export function LegalModal({ visible, onClose, type }: LegalModalProps) {
  const insets = useSafeAreaInsets();
  const isTerms = type === "terms";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-white"
        style={{ paddingBottom: insets.bottom }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
          <Text className="text-lg font-bold text-gray-900">
            {isTerms ? "Terms of Service" : "Privacy Policy"}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            activeOpacity={0.7}
          >
            <X size={18} color="#71717b" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-5 py-4"
          showsVerticalScrollIndicator={false}
        >
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </ScrollView>

        {/* Accept Button */}
        <View className="px-5 py-4 border-t border-gray-100">
          <TouchableOpacity
            onPress={onClose}
            className="h-14 bg-primary rounded-2xl items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-bold">I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TermsContent() {
  return (
    <View className="space-y-4">
      <Text className="text-sm text-gray-500 mb-4">
        Last updated: January 2, 2026
      </Text>

      <Section title="1. Acceptance of Terms">
        {'By accessing or using Gluvia AI ("the App"), you agree to be bound by'}
        these Terms of Service. If you do not agree to these terms, please do
        not use the App.
      </Section>

      <Section title="2. Description of Service">
        Gluvia AI is an offline-first mobile application designed to provide
        personalized diabetic meal guidance. The App offers food database
        access, meal logging, glucose tracking, and AI-powered nutritional
        recommendations.
      </Section>

      <Section title="3. Medical Disclaimer">
        The information provided by Gluvia AI is for educational and
        informational purposes only. It is not intended as a substitute for
        professional medical advice, diagnosis, or treatment. Always consult
        with a qualified healthcare provider before making any changes to your
        diet or diabetes management plan.
      </Section>

      <Section title="4. User Responsibilities">
        You are responsible for maintaining the confidentiality of your account
        credentials and for all activities that occur under your account. You
        agree to provide accurate and complete information when creating your
        account and to update this information as needed.
      </Section>

      <Section title="5. Data Collection and Privacy">
        Your use of the App is also governed by our Privacy Policy. By using the
        App, you consent to the collection and use of your information as
        described in our Privacy Policy.
      </Section>

      <Section title="6. Intellectual Property">
        All content, features, and functionality of the App, including but not
        limited to text, graphics, logos, and software, are owned by Gluvia AI
        and are protected by international copyright, trademark, and other
        intellectual property laws.
      </Section>

      <Section title="7. Limitation of Liability">
        To the maximum extent permitted by law, Gluvia AI shall not be liable
        for any indirect, incidental, special, consequential, or punitive
        damages resulting from your use or inability to use the App.
      </Section>

      <Section title="8. Changes to Terms">
        We reserve the right to modify these Terms of Service at any time. We
        will notify users of any material changes through the App or via email.
        Your continued use of the App after such modifications constitutes your
        acceptance of the updated terms.
      </Section>

      <Section title="9. Contact Information">
        If you have any questions about these Terms of Service, please contact
        us at support@gluvia.ai.
      </Section>
    </View>
  );
}

function PrivacyContent() {
  return (
    <View className="space-y-4">
      <Text className="text-sm text-gray-500 mb-4">
        Last updated: January 2, 2026
      </Text>

      <Section title="1. Information We Collect">
        We collect information you provide directly, including your name, email
        address, phone number, health profile (age, diabetes type, allergies),
        meal logs, and glucose readings. We also collect device information and
        usage data to improve the App.
      </Section>

      <Section title="2. How We Use Your Information">
        We use your information to provide personalized meal recommendations,
        track your health metrics, improve our services, send important
        notifications, and comply with legal obligations. Your health data is
        never sold to third parties.
      </Section>

      <Section title="3. Data Storage and Security">
        Your data is stored securely using industry-standard encryption. We
        implement appropriate technical and organizational measures to protect
        your personal information against unauthorized access, alteration, or
        destruction.
      </Section>

      <Section title="4. Offline-First Architecture">
        Gluvia AI is designed to work offline. Your data is stored locally on
        your device and synced with our servers when you have an internet
        connection. You maintain control over your data at all times.
      </Section>

      <Section title="5. Data Sharing">
        We do not sell your personal information. We may share your information
        with service providers who assist us in operating the App (e.g., cloud
        storage, email services), but only as necessary to provide our services.
      </Section>

      <Section title="6. Your Rights (NDPR Compliance)">
        Under the Nigeria Data Protection Regulation (NDPR), you have the right
        to access, correct, or delete your personal data. You can export your
        data or request account deletion at any time through the App settings.
      </Section>

      <Section title="7. Data Retention">
        We retain your personal information for as long as your account is
        active or as needed to provide services. If you delete your account,
        your personal data will be removed within 30 days, except where
        retention is required by law.
      </Section>

      <Section title="8. Children's Privacy">
        Gluvia AI is not intended for children under 13 years of age. We do not
        knowingly collect personal information from children under 13. If we
        discover such data, we will delete it promptly.
      </Section>

      <Section title="9. Changes to Privacy Policy">
        We may update this Privacy Policy periodically. We will notify you of
        any material changes through the App or via email. Your continued use
        after such changes constitutes acceptance of the updated policy.
      </Section>

      <Section title="10. Contact Us">
        If you have questions about this Privacy Policy or wish to exercise your
        data rights, please contact us at privacy@gluvia.ai.
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-5">
      <Text className="text-base font-semibold text-gray-900 mb-2">
        {title}
      </Text>
      <Text className="text-sm text-gray-600 leading-6">{children}</Text>
    </View>
  );
}
