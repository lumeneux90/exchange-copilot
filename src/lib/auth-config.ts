const DEFAULT_SESSION_COOKIE_NAME = "exchange-copilot-session";

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? DEFAULT_SESSION_COOKIE_NAME;
