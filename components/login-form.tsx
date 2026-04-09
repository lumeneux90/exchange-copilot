"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiArrowRightLine,
  RiBarChartBoxLine,
  RiCommandLine,
  RiExchangeDollarLine,
  RiShieldCheckLine,
  RiKey2Line,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";

type LoginFormProps = React.ComponentProps<"div">;

const productHighlights = [
  {
    icon: RiBarChartBoxLine,
    title: "Рынок в одном окне",
    description:
      "Котировки, индекс и динамика портфеля без лишних переключений.",
  },
  {
    icon: RiExchangeDollarLine,
    title: "Быстрые торговые сценарии",
    description: "Следите за watchlist и валютами в одном рабочем потоке.",
  },
  {
    icon: RiShieldCheckLine,
    title: "Доступ только для команды",
    description: "Закрытый вход в рабочее пространство аналитики и сделок.",
  },
];

export function LoginForm({ className, ...props }: LoginFormProps) {
  const router = useRouter();
  const [isOtpVisible, setIsOtpVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();

    if (isOtpVisible) {
      setErrorMessage(
        "OTP-вход пока доступен только как UI-сценарий. Для входа используйте логин и пароль."
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      login: String(formData.get("login") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setErrorMessage(data?.message ?? "Не удалось выполнить вход.");
        return;
      }

      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch {
      setErrorMessage("Не удалось выполнить вход. Проверьте соединение и попробуйте снова.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className} {...props}>
      <Card className="border-border/60 bg-card/95 shadow-primary/5 overflow-hidden p-0 shadow-xl backdrop-blur">
        <CardContent className="grid p-0 lg:grid-cols-[1.05fr_0.95fr]">
          <form
            className="flex flex-col justify-center p-6 sm:p-8 lg:p-10"
            onSubmit={handleSubmit}
          >
            <FieldGroup className="gap-5">
              <div className="flex flex-col gap-4 text-left">
                <div className="text-primary flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  <RiCommandLine className="size-8 sm:size-9" />
                  Xchange Copilot
                </div>
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Вход на торговую площадку
                  </h1>
                  <p className="text-muted-foreground max-w-md text-sm sm:text-base">
                    Авторизуйтесь, чтобы открыть обзор рынка, портфель и
                    инструменты для управления сделками.
                  </p>
                </div>
              </div>

              <Field>
                <FieldLabel htmlFor="login">Логин</FieldLabel>
                <Input
                  id="login"
                  name="login"
                  type="text"
                  placeholder="trader_admin"
                  autoComplete="username"
                  className="h-11 text-sm"
                  disabled={isSubmitting}
                  required
                />
              </Field>

              <Field>
                <div className="flex items-center gap-3">
                  <FieldLabel htmlFor="password">Пароль</FieldLabel>
                  {!isOtpVisible && (
                    <Link
                      href="#"
                      className="text-muted-foreground hover:text-foreground ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Забыли пароль?
                    </Link>
                  )}
                </div>
                {isOtpVisible ? (
                  <InputOTP
                    id="login-otp"
                    maxLength={6}
                    containerClassName="justify-start"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="size-11 text-sm" />
                      <InputOTPSlot index={1} className="size-11 text-sm" />
                      <InputOTPSlot index={2} className="size-11 text-sm" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="size-11 text-sm" />
                      <InputOTPSlot index={4} className="size-11 text-sm" />
                      <InputOTPSlot index={5} className="size-11 text-sm" />
                    </InputOTPGroup>
                  </InputOTP>
                ) : (
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="h-11 text-sm"
                    disabled={isSubmitting}
                    required
                  />
                )}
              </Field>

              {errorMessage ? (
                <Field>
                  <FieldDescription className="text-destructive">
                    {errorMessage}
                  </FieldDescription>
                </Field>
              ) : null}

              <Field>
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full justify-center text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Выполняем вход
                    </>
                  ) : (
                    <>
                      Войти в систему
                      <RiArrowRightLine data-icon="inline-end" />
                    </>
                  )}
                </Button>
              </Field>

              <FieldSeparator>или</FieldSeparator>

              <Field>
                <Button
                  variant="outline"
                  type="button"
                  size="lg"
                  className="h-11 w-full text-sm"
                  disabled={isSubmitting}
                  onClick={() => setIsOtpVisible((current) => !current)}
                >
                  <RiKey2Line data-icon="inline-start" />
                  {isOtpVisible ? "Скрыть OTP" : "Войти через OTP"}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <div className="border-border/60 bg-muted/50 relative hidden overflow-hidden border-l lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_42%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.5)_100%)] dark:bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.03)_100%)]" />
            <div className="relative flex h-full flex-col p-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <h2 className="text-foreground max-w-sm text-3xl font-semibold tracking-tight">
                    Контролируйте рынок и портфель из одной панели.
                  </h2>
                </div>

                <div className="grid gap-3">
                  {productHighlights.map(
                    ({ icon: Icon, title, description }) => (
                      <Card
                        key={title}
                        className="border-border/60 bg-background/80 rounded-2xl shadow-sm backdrop-blur"
                      >
                        <CardHeader className="gap-3">
                          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                            <Icon />
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-base">{title}</CardTitle>
                            <CardDescription className="text-sm leading-6">
                              {description}
                            </CardDescription>
                          </div>
                        </CardHeader>
                      </Card>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
