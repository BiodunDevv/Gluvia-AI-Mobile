import { AuthScreenShell, RegisterForm } from "@/components/auth";

export default function RegisterScreen() {
  return (
    <AuthScreenShell
      rightButtonText="Sign In"
      rightButtonHref="/(auth)/login"
    >
      <RegisterForm />
    </AuthScreenShell>
  );
}
