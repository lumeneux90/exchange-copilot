import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/src/features/theme/ui/theme-toggle";

export default function LoginPage() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_30%),linear-gradient(180deg,rgba(245,247,245,0.95)_0%,transparent_40%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_28%),linear-gradient(180deg,rgba(12,18,14,0.85)_0%,transparent_38%)]" />
      <div className="absolute top-6 right-6 z-10 md:top-8 md:right-8">
        <ThemeToggle />
      </div>
      <div className="relative flex min-h-svh items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-6xl">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
