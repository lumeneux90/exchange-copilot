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
import { Spinner } from "@/components/ui/spinner";
import {
  PASSCODE_HYDRATION_RELOAD_SESSION_KEY,
  PASSCODE_STORAGE_KEY,
  PASSCODE_SETUP_PENDING_SESSION_KEY,
  PASSCODE_UNLOCKED_SESSION_KEY,
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
  description: string;
  errorMessage: string | null;
  icon: RemixiconComponentType;
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
  description,
  errorMessage,
  icon: Icon,
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
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [needsSetup, setNeedsSetup] = React.useState(false);
  const [passcode, setPasscode] = React.useState("");
  const [confirmPasscode, setConfirmPasscode] = React.useState("");
  const [unlockPasscode, setUnlockPasscode] = React.useState("");
  const [setupStep, setSetupStep] = React.useState<"create" | "confirm">(
    "create"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const isAutoAdvancingRef = React.useRef(false);
  const isAutoSubmittingRef = React.useRef(false);
  const isAutoUnlockingRef = React.useRef(false);

  React.useEffect(() => {
    window.sessionStorage.removeItem(PASSCODE_HYDRATION_RELOAD_SESSION_KEY);
    (
      window as Window & {
        __exchangePasscodeHydrated?: boolean;
      }
    ).__exchangePasscodeHydrated = true;
    setIsHydrated(true);
  }, []);

  const resetUnlockFlow = React.useCallback(() => {
    if (currentUser) {
      window.sessionStorage.removeItem(PASSCODE_UNLOCKED_SESSION_KEY);
      window.sessionStorage.removeItem(PASSCODE_SKIP_ONCE_SESSION_KEY);
    }
    setErrorMessage(null);
    setUnlockPasscode("");
    setIsUnlocked(false);
  }, [currentUser]);

  React.useEffect(() => {
    if (!currentUser) {
      setIsUnlocked(false);
      setNeedsSetup(false);
      return;
    }

    const storedPasscode = readStoredPasscode();
    const unlockedSessionLogin = window.sessionStorage.getItem(
      PASSCODE_UNLOCKED_SESSION_KEY
    );
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
      if (unlockedSessionLogin && unlockedSessionLogin !== currentUser.login) {
        window.sessionStorage.removeItem(PASSCODE_UNLOCKED_SESSION_KEY);
      }

      setPasscode("");
      setConfirmPasscode("");
      setSetupStep("create");
      setNeedsSetup(pendingSetupLogin === currentUser.login);
      setErrorMessage(null);
      setIsUnlocked(true);
      window.sessionStorage.setItem(
        PASSCODE_UNLOCKED_SESSION_KEY,
        currentUser.login
      );
      return;
    }

    setNeedsSetup(false);
    setErrorMessage(null);
    setUnlockPasscode("");
    setIsUnlocked(
      unlockedSessionLogin === currentUser.login ||
        skipOnceLogin === currentUser.login
    );
    if (skipOnceLogin) {
      window.sessionStorage.removeItem(PASSCODE_SKIP_ONCE_SESSION_KEY);
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    const storedPasscode = readStoredPasscode();

    if (!storedPasscode || storedPasscode.login !== currentUser.login) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        resetUnlockFlow();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        resetUnlockFlow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [currentUser, resetUnlockFlow]);

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
    window.sessionStorage.setItem(
      PASSCODE_UNLOCKED_SESSION_KEY,
      currentUser.login
    );
    setIsUnlocked(true);
  }, [confirmPasscode, currentUser, passcode]);

  const handleUnlock = React.useCallback(async () => {
    const storedPasscode = readStoredPasscode();

    if (!storedPasscode) {
      setPasscode("");
      setConfirmPasscode("");
      setSetupStep("create");
      setNeedsSetup(true);
      if (currentUser) {
        window.sessionStorage.setItem(
          PASSCODE_UNLOCKED_SESSION_KEY,
          currentUser.login
        );
      }
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
    window.sessionStorage.setItem(
      PASSCODE_UNLOCKED_SESSION_KEY,
      storedPasscode.login
    );
    setIsUnlocked(true);
  }, [currentUser, unlockPasscode]);

  const startConfirmStep = React.useCallback(() => {
    if (!/^\d{4}$/.test(passcode)) {
      setErrorMessage("Введите 4 цифры pass code.");
      return;
    }

    setErrorMessage(null);
    setConfirmPasscode("");
    setSetupStep("confirm");
  }, [passcode]);

  React.useEffect(() => {
    if (setupStep !== "create") {
      isAutoAdvancingRef.current = false;
      return;
    }

    if (passcode.length !== PASSCODE_LENGTH || isAutoAdvancingRef.current) {
      if (passcode.length !== PASSCODE_LENGTH) {
        isAutoAdvancingRef.current = false;
      }
      return;
    }

    isAutoAdvancingRef.current = true;
    startConfirmStep();
  }, [passcode, setupStep, startConfirmStep]);

  React.useEffect(() => {
    if (!needsSetup || setupStep !== "confirm") {
      isAutoSubmittingRef.current = false;
      return;
    }

    if (
      confirmPasscode.length !== PASSCODE_LENGTH ||
      isAutoSubmittingRef.current
    ) {
      if (confirmPasscode.length !== PASSCODE_LENGTH) {
        isAutoSubmittingRef.current = false;
      }
      return;
    }

    isAutoSubmittingRef.current = true;
    void handleCreatePasscode().finally(() => {
      isAutoSubmittingRef.current = false;
    });
  }, [confirmPasscode, handleCreatePasscode, needsSetup, setupStep]);

  React.useEffect(() => {
    if (isUnlocked) {
      isAutoUnlockingRef.current = false;
      return;
    }

    if (
      unlockPasscode.length !== PASSCODE_LENGTH ||
      isAutoUnlockingRef.current
    ) {
      if (unlockPasscode.length !== PASSCODE_LENGTH) {
        isAutoUnlockingRef.current = false;
      }
      return;
    }

    isAutoUnlockingRef.current = true;
    void handleUnlock().finally(() => {
      isAutoUnlockingRef.current = false;
    });
  }, [handleUnlock, isUnlocked, unlockPasscode]);

  if (!currentUser) {
    return <>{children}</>;
  }

  if (!isHydrated) {
    return (
      <PasscodeShell>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  window.__exchangePasscodeHydrated = false;
                  var reloadKey = ${JSON.stringify(
                    PASSCODE_HYDRATION_RELOAD_SESSION_KEY
                  )};
                  if (window.sessionStorage.getItem(reloadKey) === "1") {
                    return;
                  }
                  window.setTimeout(function () {
                    if (window.__exchangePasscodeHydrated) {
                      return;
                    }
                    window.sessionStorage.setItem(reloadKey, "1");
                    window.location.reload();
                  }, 1500);
                } catch (error) {}
              })();
            `,
          }}
        />
        <div className="text-foreground/88 relative flex flex-col items-center gap-3 text-center">
          <div className="bg-background/70 border-border/50 flex size-12 items-center justify-center rounded-full border shadow-sm backdrop-blur-md">
            <Spinner className="text-primary size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium sm:text-base">
              Подключаем экран разблокировки
            </p>
          </div>
        </div>
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
            description="Введите 4-значный код для разблокировки."
            errorMessage={errorMessage}
            icon={RiShieldKeyholeLine}
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
                description="Придумайте 4-значный код для быстрого входа."
                errorMessage={errorMessage}
                icon={RiLockPasswordLine}
                onChange={(value) => {
                  setErrorMessage(null);
                  setPasscode(value);
                }}
                title="Создайте pass code"
                value={passcode}
              />
            ) : (
              <PasscodePad
                description="Повторите код для быстрого входа."
                errorMessage={errorMessage}
                icon={RiLockPasswordLine}
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
