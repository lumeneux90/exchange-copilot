"use client";

import * as React from "react";
import {
  RiArrowLeftSLine,
  RiDeleteBack2Line,
  RiLockPasswordLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import {
  PASSCODE_STORAGE_KEY,
  PASSCODE_SETUP_PENDING_SESSION_KEY,
  PASSCODE_SKIP_ONCE_SESSION_KEY,
} from "@/src/features/passcode/model/storage";
import { cn } from "@/src/lib/utils";

type CurrentUser = {
  id: string;
  login: string;
} | null;

type StoredPasscode = {
  login: string;
  hash: string;
  version: 1;
};

type PasscodePadProps = {
  actionLabel: string;
  description: string;
  errorMessage: string | null;
  icon: RemixiconComponentType;
  isActionEnabled: boolean;
  onAction: () => void;
  onBack?: (() => void) | null;
  onChange: (value: string) => void;
  title: string;
  value: string;
};

const PASSCODE_LENGTH = 4;
const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

async function hashPasscode(passcode: string) {
  const bytes = new TextEncoder().encode(passcode);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function readStoredPasscode() {
  const rawValue = window.localStorage.getItem(PASSCODE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredPasscode;
  } catch {
    window.localStorage.removeItem(PASSCODE_STORAGE_KEY);
    return null;
  }
}

function persistPasscode(passcode: StoredPasscode) {
  window.localStorage.setItem(PASSCODE_STORAGE_KEY, JSON.stringify(passcode));
}

function PasscodeDots({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: PASSCODE_LENGTH }, (_, index) => {
        const isFilled = index < value.length;

        return (
          <div
            key={index}
            className={cn(
              "border-border/70 bg-background/80 flex size-5 items-center justify-center rounded-full border transition-all sm:size-6",
              isFilled && "border-primary bg-primary/12"
            )}
          >
            <div
              className={cn(
                "bg-primary size-0 rounded-full transition-all",
                isFilled && "size-2.5 sm:size-3"
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className="h-16 rounded-3xl text-lg font-semibold sm:h-18 sm:text-xl"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function PasscodePad({
  actionLabel,
  description,
  errorMessage,
  icon: Icon,
  isActionEnabled,
  onAction,
  onBack,
  onChange,
  title,
  value,
}: PasscodePadProps) {
  const appendDigit = React.useCallback(
    (digit: string) => {
      if (value.length >= PASSCODE_LENGTH) {
        return;
      }

      onChange(`${value}${digit}`);
    },
    [onChange, value]
  );

  const removeDigit = React.useCallback(() => {
    onChange(value.slice(0, -1));
  }, [onChange, value]);

  return (
    <Card className="border-border/70 bg-card/96 w-full max-w-md py-0 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
      <CardHeader className="px-6 pt-7 sm:px-8 sm:pt-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-3xl sm:size-16">
            <Icon className="size-6 sm:size-7" />
          </div>
          <div className="flex flex-col gap-2">
            <CardTitle className="text-lg font-semibold sm:text-xl">
              {title}
            </CardTitle>
            <CardDescription className="max-w-sm text-sm leading-6 sm:text-base">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4">
            <PasscodeDots value={value} />
            <div className="text-muted-foreground text-xs tracking-[0.24em] uppercase">
              {value.length}/{PASSCODE_LENGTH}
            </div>
          </div>

          {errorMessage && (
            <FieldDescription className="text-destructive text-center text-sm">
              {errorMessage}
            </FieldDescription>
          )}

          <div className="grid grid-cols-3 gap-3">
            {keypadDigits.map((digit) => (
              <KeypadButton key={digit} onClick={() => appendDigit(digit)}>
                {digit}
              </KeypadButton>
            ))}
            <KeypadButton
              variant="outline"
              onClick={() => {
                onBack?.();
              }}
            >
              {onBack ? (
                <>
                  <RiArrowLeftSLine data-icon="inline-start" />
                  Назад
                </>
              ) : (
                <span className="text-muted-foreground">•</span>
              )}
            </KeypadButton>
            <KeypadButton onClick={() => appendDigit("0")}>0</KeypadButton>
            <KeypadButton variant="outline" onClick={removeDigit}>
              <RiDeleteBack2Line />
            </KeypadButton>
          </div>

          <Button
            type="button"
            size="lg"
            className="h-12 rounded-2xl text-sm sm:h-13"
            disabled={!isActionEnabled}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PasscodeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/90 fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-2xl sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_42%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_42%)]" />
      <div className="relative flex w-full justify-center">{children}</div>
    </div>
  );
}

export function PasscodeGate({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: CurrentUser;
}) {
  const [isReady, setIsReady] = React.useState(false);
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [needsSetup, setNeedsSetup] = React.useState(false);
  const [passcode, setPasscode] = React.useState("");
  const [confirmPasscode, setConfirmPasscode] = React.useState("");
  const [unlockPasscode, setUnlockPasscode] = React.useState("");
  const [setupStep, setSetupStep] = React.useState<"create" | "confirm">(
    "create"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!currentUser) {
      setIsReady(true);
      setIsUnlocked(false);
      setNeedsSetup(false);
      return;
    }

    const storedPasscode = readStoredPasscode();
    const skipOnceLogin = window.sessionStorage.getItem(
      PASSCODE_SKIP_ONCE_SESSION_KEY
    );
    const pendingSetupLogin = window.sessionStorage.getItem(
      PASSCODE_SETUP_PENDING_SESSION_KEY
    );

    if (!storedPasscode || storedPasscode.login !== currentUser.login) {
      if (storedPasscode && storedPasscode.login !== currentUser.login) {
        window.localStorage.removeItem(PASSCODE_STORAGE_KEY);
      }

      setPasscode("");
      setConfirmPasscode("");
      setSetupStep("create");
      setNeedsSetup(pendingSetupLogin === currentUser.login);
      setErrorMessage(null);
      setIsUnlocked(true);
      setIsReady(true);
      return;
    }

    setNeedsSetup(false);
    setErrorMessage(null);
    setUnlockPasscode("");
    setIsUnlocked(skipOnceLogin === currentUser.login);
    if (skipOnceLogin === currentUser.login) {
      window.sessionStorage.removeItem(PASSCODE_SKIP_ONCE_SESSION_KEY);
    }
    setIsReady(true);
  }, [currentUser]);

  const handleCreatePasscode = React.useCallback(async () => {
    if (!currentUser) {
      return;
    }

    if (!/^\d{4}$/.test(passcode)) {
      setErrorMessage("Pass code должен состоять из 4 цифр.");
      return;
    }

    if (!/^\d{4}$/.test(confirmPasscode)) {
      setErrorMessage("Повторите 4-значный pass code.");
      return;
    }

    if (passcode !== confirmPasscode) {
      setErrorMessage("Pass code не совпадает. Попробуйте ещё раз.");
      setConfirmPasscode("");
      setSetupStep("create");
      return;
    }

    persistPasscode({
      login: currentUser.login,
      hash: await hashPasscode(passcode),
      version: 1,
    });

    setErrorMessage(null);
    setPasscode("");
    setConfirmPasscode("");
    setSetupStep("create");
    setNeedsSetup(false);
    window.sessionStorage.removeItem(PASSCODE_SETUP_PENDING_SESSION_KEY);
    setIsUnlocked(true);
  }, [confirmPasscode, currentUser, passcode]);

  const handleUnlock = React.useCallback(async () => {
    const storedPasscode = readStoredPasscode();

    if (!storedPasscode) {
      setPasscode("");
      setConfirmPasscode("");
      setSetupStep("create");
      setNeedsSetup(true);
      setIsUnlocked(true);
      return;
    }

    if (!/^\d{4}$/.test(unlockPasscode)) {
      setErrorMessage("Введите 4 цифры pass code.");
      return;
    }

    const unlockHash = await hashPasscode(unlockPasscode);

    if (unlockHash !== storedPasscode.hash) {
      setErrorMessage("Неверный pass code.");
      setUnlockPasscode("");
      return;
    }

    setErrorMessage(null);
    setUnlockPasscode("");
    setIsUnlocked(true);
  }, [unlockPasscode]);

  const startConfirmStep = React.useCallback(() => {
    if (!/^\d{4}$/.test(passcode)) {
      setErrorMessage("Введите 4 цифры pass code.");
      return;
    }

    setErrorMessage(null);
    setConfirmPasscode("");
    setSetupStep("confirm");
  }, [passcode]);

  if (!currentUser) {
    return <>{children}</>;
  }

  if (!isReady) {
    return (
      <PasscodeShell>
        <Card className="border-border/70 bg-card/96 w-full max-w-md py-0 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
          <CardHeader className="px-6 py-8 sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-3xl sm:size-16">
                <RiShieldKeyholeLine className="size-6 sm:size-7" />
              </div>
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg font-semibold sm:text-xl">
                  Проверяем быстрый вход
                </CardTitle>
                <CardDescription className="max-w-sm text-sm leading-6 sm:text-base">
                  Подготавливаем экран разблокировки для {currentUser.login}.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </PasscodeShell>
    );
  }

  const shouldRenderProtectedContent = isUnlocked;

  return (
    <>
      {shouldRenderProtectedContent ? children : null}
      {!isUnlocked ? (
        <PasscodeShell>
          <PasscodePad
            actionLabel="Разблокировать"
            description="Введите 4-значный код для разблокировки."
            errorMessage={errorMessage}
            icon={RiShieldKeyholeLine}
            isActionEnabled={unlockPasscode.length === PASSCODE_LENGTH}
            onAction={() => {
              void handleUnlock();
            }}
            onChange={(value) => {
              setErrorMessage(null);
              setUnlockPasscode(value);
            }}
            title="Быстрый вход"
            value={unlockPasscode}
          />
        </PasscodeShell>
      ) : null}
      {needsSetup ? (
        <div className="bg-background/86 fixed inset-0 z-40 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-xl sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_34%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_40%)]" />
          <div className="relative flex w-full flex-col items-center">
            {setupStep === "create" ? (
              <PasscodePad
                actionLabel="Продолжить"
                description="Придумайте 4-значный код для быстрого входа."
                errorMessage={errorMessage}
                icon={RiLockPasswordLine}
                isActionEnabled={passcode.length === PASSCODE_LENGTH}
                onAction={startConfirmStep}
                onChange={(value) => {
                  setErrorMessage(null);
                  setPasscode(value);
                }}
                title="Создайте pass code"
                value={passcode}
              />
            ) : (
              <PasscodePad
                actionLabel="Сохранить код"
                description="Повторите код для быстрого входа."
                errorMessage={errorMessage}
                icon={RiLockPasswordLine}
                isActionEnabled={confirmPasscode.length === PASSCODE_LENGTH}
                onAction={() => {
                  void handleCreatePasscode();
                }}
                onBack={() => {
                  setErrorMessage(null);
                  setConfirmPasscode("");
                  setSetupStep("create");
                }}
                onChange={(value) => {
                  setErrorMessage(null);
                  setConfirmPasscode(value);
                }}
                title="Повторите pass code"
                value={confirmPasscode}
              />
            )}
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground h-10 rounded-2xl"
                onClick={() => {
                  setErrorMessage(null);
                  setPasscode("");
                  setConfirmPasscode("");
                  setSetupStep("create");
                  window.sessionStorage.removeItem(
                    PASSCODE_SETUP_PENDING_SESSION_KEY
                  );
                  setNeedsSetup(false);
                }}
              >
                Настроить позже
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
