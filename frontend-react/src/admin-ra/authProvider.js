// Thin adapter that plugs the app's existing session (from App.jsx) into react-admin.
// It does NOT own the session: real sign-in happens in LoginPage, and logout delegates
// to App.jsx's onLogout (which clears localStorage + calls the logout API).
export function createAuthProvider({ session, onLogout }) {
  const isAdmin = () => Boolean(session && session.role === 'ADMIN');

  return {
    // No-op: <Admin> never shows its own login screen — the auth gate in AdminApp does.
    login: () => Promise.resolve(),

    logout: () => {
      onLogout?.();
      return Promise.resolve();
    },

    checkAuth: () => (isAdmin() ? Promise.resolve() : Promise.reject()),

    // Token expired / revoked mid-session → sign out and bounce to the gate.
    checkError: (error) => {
      const status = error?.status ?? error?.response?.status;
      if (status === 401 || status === 403) {
        onLogout?.();
        return Promise.reject();
      }
      return Promise.resolve();
    },

    getIdentity: () => Promise.resolve({
      id: session?.userId ?? 'admin',
      fullName: session?.fullName || session?.email || 'Quản trị viên',
      avatar: session?.avatarUrl || undefined,
    }),

    getPermissions: () => Promise.resolve(session?.role ?? null),
  };
}
