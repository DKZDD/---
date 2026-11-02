/**
 * Gerenciamento do token de sessão no navegador, em camadas:
 *
 *  1. memória (sempre funciona, dura a vida da aba/página);
 *  2. localStorage (persiste entre visitas, quando o navegador permite);
 *  3. cookie httpOnly (canal paralelo, validado no servidor).
 *
 * O acesso ao localStorage é protegido por try/catch: em iframes de
 * terceiros com bloqueio de cookies, navegadores como Chrome/Safari também
 * bloqueiam o DOM Storage lançando SecurityError.
 */
export const SESSION_STORAGE_KEY = "ducke_session";

let memoryToken = "";

export function setMemoryToken(token: string): void {
  memoryToken = token;
}

export function getStoredToken(): string {
  if (memoryToken) return memoryToken;
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(SESSION_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function persistToken(token: string): void {
  memoryToken = token;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    /* storage bloqueado: a memória já cobre a sessão atual */
  }
}

/** Header Authorization com o token atual (canal imune a bloqueio de cookies) */
export function authHeaders(): Record<string, string> {
  const t = getStoredToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function clearToken(): void {
  memoryToken = "";
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* nada a fazer */
  }
}
