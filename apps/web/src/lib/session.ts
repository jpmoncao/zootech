export type Session = {
  identifier: string;
  display: string;
  persist: boolean;
  posto: string | null;
};

const KEY = "zootech.session";

export function readSession(): Session | null {
  const raw = window.localStorage.getItem(KEY) ?? window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Session;
    if (!data.display || !data.identifier) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSession(session: Session) {
  const raw = JSON.stringify(session);
  window.localStorage.removeItem(KEY);
  window.sessionStorage.removeItem(KEY);
  const store = session.persist ? window.localStorage : window.sessionStorage;
  store.setItem(KEY, raw);
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
  window.sessionStorage.removeItem(KEY);
}

export function maskIdentifier(
  value: string,
): { ok: true; identifier: string; display: string } | { ok: false; message: string } {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return { ok: false, message: "Informe o CPF ou a matrícula." };
  }
  if (digits.length === 11) {
    const display = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    return { ok: true, identifier: digits, display };
  }
  if (digits.length >= 4 && digits.length <= 8) {
    return { ok: true, identifier: digits, display: trimmed };
  }
  return {
    ok: false,
    message: "Use o CPF com 11 dígitos ou a matrícula do servidor.",
  };
}
