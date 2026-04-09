export function getUserInitials(login: string) {
  return login.trim().slice(0, 2).toUpperCase();
}
