const SESSION_KEY = 'travinh-realty-session';

export function loadStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function createSession(auth, profile = {}) {
  return {
    token: auth.accessToken,
    userId: auth.userId || profile.id,
    email: auth.email || profile.email,
    role: auth.role || profile.role,
    fullName: profile.fullName || auth.email,
    phone: profile.phone || '',
    avatarUrl: profile.avatarUrl || '',
    status: profile.status || 'ACTIVE',
  };
}
