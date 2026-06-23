const BASE_AUTH_KEYS = {
  accessToken: "accessToken",
  tokenType: "tokenType",
  currentUser: "currentUser",
  tokenExpiresAt: "tokenExpiresAt",
};

const AUTH_SCOPES = {
  admin: "admin",
  customer: "customer",
  delivery: "delivery",
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

function normalizeScope(scope = AUTH_SCOPES.customer) {
  return Object.values(AUTH_SCOPES).includes(scope)
    ? scope
    : AUTH_SCOPES.customer;
}

function getScopedAuthKeys(scope = AUTH_SCOPES.customer) {
  const normalizedScope = normalizeScope(scope);

  return Object.fromEntries(
    Object.entries(BASE_AUTH_KEYS).map(([name, key]) => [
      name,
      `${normalizedScope}:${key}`,
    ])
  );
}

function getScopeFromPathname(pathname = "") {
  if (pathname.startsWith("/admin")) {
    return AUTH_SCOPES.admin;
  }

  if (pathname.startsWith("/delivery")) {
    return AUTH_SCOPES.delivery;
  }

  return AUTH_SCOPES.customer;
}

function getCurrentAuthScope() {
  if (typeof window === "undefined") {
    return AUTH_SCOPES.customer;
  }

  return getScopeFromPathname(window.location.pathname);
}

function removeKeys(storage, keys) {
  if (!storage) {
    return;
  }

  Object.values(keys).forEach((key) => storage.removeItem(key));
}

function clearLegacyAuthKeys() {
  const localStorage = getBrowserStorage("local");
  const sessionStorage = getBrowserStorage("session");

  [localStorage, sessionStorage].forEach((storage) => {
    removeKeys(storage, BASE_AUTH_KEYS);
  });
}

export function isAdminUser(user) {
  return String(user?.roleName || "").toLowerCase() === "admin";
}

export function isDeliveryStaffUser(user) {
  return String(user?.roleName || "").toLowerCase() === "delivery_staff";
}

export function getAuthSession(scope = AUTH_SCOPES.customer) {
  const localStorage = getBrowserStorage("local");
  const sessionStorage = getBrowserStorage("session");
  const authKeys = getScopedAuthKeys(scope);

  if (!localStorage || !sessionStorage) {
    return null;
  }

  const storage = localStorage.getItem(authKeys.accessToken)
    ? localStorage
    : sessionStorage.getItem(authKeys.accessToken)
      ? sessionStorage
      : null;

  if (!storage) {
    return null;
  }

  return {
    accessToken: storage.getItem(authKeys.accessToken),
    tokenType: storage.getItem(authKeys.tokenType) || "Bearer",
    currentUser: safeParseJson(storage.getItem(authKeys.currentUser)),
    tokenExpiresAt: Number(storage.getItem(authKeys.tokenExpiresAt) || 0),
    scope: normalizeScope(scope),
  };
}

export function getAuthToken(scope = getCurrentAuthScope()) {
  return getAuthSession(scope)?.accessToken || "";
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

  const session = getAuthSession(AUTH_SCOPES.admin);

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

export function isAuthSessionRemembered(scope = AUTH_SCOPES.customer) {
  const localStorage = getBrowserStorage("local");
  const authKeys = getScopedAuthKeys(scope);

  return Boolean(localStorage?.getItem(authKeys.accessToken));
}

export function saveAuthSession(
  payload,
  { remember = true, scope = AUTH_SCOPES.customer } = {}
) {
  const authKeys = getScopedAuthKeys(scope);
  const storage = getBrowserStorage(remember ? "local" : "session");
  const staleStorage = getBrowserStorage(remember ? "session" : "local");

  if (!storage || !payload?.accessToken) {
    return;
  }

  clearLegacyAuthKeys();

  storage.setItem(authKeys.accessToken, payload.accessToken);
  storage.setItem(authKeys.tokenType, payload.tokenType || "Bearer");
  storage.setItem(authKeys.currentUser, JSON.stringify(payload.user || null));

  if (payload.expiresIn) {
    storage.setItem(
      authKeys.tokenExpiresAt,
      String(Date.now() + Number(payload.expiresIn))
    );
  } else {
    storage.removeItem(authKeys.tokenExpiresAt);
  }

  removeKeys(staleStorage, authKeys);
}

export function clearAuthSession(scope) {
  const localStorage = getBrowserStorage("local");
  const sessionStorage = getBrowserStorage("session");
  const scopes = scope
    ? [normalizeScope(typeof scope === "string" ? scope : scope.scope)]
    : Object.values(AUTH_SCOPES);

  [localStorage, sessionStorage].forEach((storage) => {
    scopes.forEach((currentScope) => {
      removeKeys(storage, getScopedAuthKeys(currentScope));
    });
  });

  if (!scope) {
    clearLegacyAuthKeys();
  }
}

export { AUTH_SCOPES };
