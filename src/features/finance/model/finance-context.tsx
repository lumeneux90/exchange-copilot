"use client";

import * as React from "react";

import { getFinanceStateAction } from "@/src/features/finance/model/actions";
import {
  emptyFinanceState,
  type FinanceState,
} from "@/src/features/finance/model/types";

const FINANCE_REFRESH_EVENT = "finance:refresh";

type FinanceContextValue = {
  finance: FinanceState;
  isPending: boolean;
  refreshFinance: () => Promise<void>;
};

const FinanceContext = React.createContext<FinanceContextValue | null>(null);

export function notifyFinanceRefresh(finance?: FinanceState) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<FinanceState | undefined>(FINANCE_REFRESH_EVENT, {
      detail: finance,
    })
  );
}

export function FinanceProvider({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: {
    id: string;
    login: string;
  } | null;
}) {
  const [finance, setFinance] = React.useState<FinanceState>(emptyFinanceState);
  const [isPending, setIsPending] = React.useState(Boolean(currentUser));
  const loadedUserIdRef = React.useRef<string | null>(null);

  const refreshFinance = React.useCallback(async () => {
    setIsPending(true);

    try {
      const nextFinance = await getFinanceStateAction();
      setFinance(nextFinance);
    } finally {
      setIsPending(false);
    }
  }, []);

  React.useEffect(() => {
    if (!currentUser) {
      setFinance(emptyFinanceState());
      loadedUserIdRef.current = null;
      return;
    }

    if (loadedUserIdRef.current === currentUser.id) {
      return;
    }

    loadedUserIdRef.current = currentUser.id;
    void refreshFinance();
  }, [currentUser, refreshFinance]);

  React.useEffect(() => {
    function handleRefresh(event: Event) {
      const nextFinance = (event as CustomEvent<FinanceState | undefined>)
        .detail;

      if (nextFinance) {
        setFinance(nextFinance);
        return;
      }

      void refreshFinance();
    }

    window.addEventListener(FINANCE_REFRESH_EVENT, handleRefresh);

    return () => {
      window.removeEventListener(FINANCE_REFRESH_EVENT, handleRefresh);
    };
  }, [refreshFinance]);

  const value = React.useMemo(
    () => ({
      finance,
      isPending,
      refreshFinance,
    }),
    [finance, isPending, refreshFinance]
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = React.useContext(FinanceContext);

  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider.");
  }

  return context;
}
