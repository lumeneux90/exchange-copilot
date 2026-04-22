"use client";

import * as React from "react";

type CurrentUser = {
  id: string;
  login: string;
} | null;

const CurrentUserContext = React.createContext<CurrentUser>(null);

export function CurrentUserProvider({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: CurrentUser;
}) {
  return (
    <CurrentUserContext.Provider value={currentUser}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return React.useContext(CurrentUserContext);
}
