const AUTH_KEYS = {
  accessToken: "accessToken",
  tokenType: "tokenType",
  currentUser: "currentUser",
  tokenExpiresAt: "tokenExpiresAt",
};

function getBrowserStorage(type) {
  if (typeof window === "undefined") {
    return null;
  }

  return type === "session" ? window.sessionStorage : window.localStorage;
}

function safeParseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function isAdminUser(user) {
  return String(user?.roleName || "").toLowerCase() === "admin";
}

export function getAuthSession() {
  const localStorage = getBrowserStorage("local");
  const sessionStorage = getBrowserStorage("session");

  if (!localStorage || !sessionStorage) {
    return null;
  }

  const storage = localStorage.getItem(AUTH_KEYS.accessToken)
    ? localStorage
    : sessionStorage.getItem(AUTH_KEYS.accessToken)
      ? sessionStorage
      : null;

  if (!storage) {
    return null;
  }

  return {
    accessToken: storage.getItem(AUTH_KEYS.accessToken),
    tokenType: storage.getItem(AUTH_KEYS.tokenType) || "Bearer",
    currentUser: safeParseJson(storage.getItem(AUTH_KEYS.currentUser)),
    tokenExpiresAt: Number(storage.getItem(AUTH_KEYS.tokenExpiresAt) || 0),
  };
}

export function getAuthToken() {
  return getAuthSession()?.accessToken || "";
}

export function isAuthSessionExpired(session = getAuthSession()) {
  if (!session?.tokenExpiresAt) {
    return false;
  }

  return Date.now() >= Number(session.tokenExpiresAt);
}

export function getAdminAuthState() {
  if (typeof window === "undefined") {
    return { status: "checking", session: null };
  }

  const session = getAuthSession();

  if (!session?.accessToken) {
    return { status: "unauthenticated", session: null };
  }

  if (isAuthSessionExpired(session)) {
    return { status: "expired", session };
  }

  if (!isAdminUser(session.currentUser)) {
    return { status: "forbidden", session };
  }

  return { status: "authenticated", session };
}

export function saveAuthSession(payload, { remember = true } = {}) {
  const storage = getBrowserStorage(remember ? "local" : "session");
  const staleStorage = getBrowserStorage(remember ? "session" : "local");

  if (!storage || !payload?.accessToken) {
    return;
  }

  storage.setItem(AUTH_KEYS.accessToken, payload.accessToken);
  storage.setItem(AUTH_KEYS.tokenType, payload.tokenType || "Bearer");
  storage.setItem(AUTH_KEYS.currentUser, JSON.stringify(payload.user || null));

  if (payload.expiresIn) {
    storage.setItem(
      AUTH_KEYS.tokenExpiresAt,
      String(Date.now() + Number(payload.expiresIn))
    );
  } else {
    storage.removeItem(AUTH_KEYS.tokenExpiresAt);
  }

  if (staleStorage) {
    Object.values(AUTH_KEYS).forEach((key) => staleStorage.removeItem(key));
  }
}

export function clearAuthSession() {
  const localStorage = getBrowserStorage("local");
  const sessionStorage = getBrowserStorage("session");

  [localStorage, sessionStorage].forEach((storage) => {
    if (!storage) {
      return;
    }

    Object.values(AUTH_KEYS).forEach((key) => storage.removeItem(key));
  });
}
