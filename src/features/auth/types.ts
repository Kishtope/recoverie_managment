// Public user shape returned by the auth endpoints (never includes the password hash).
export type AuthUser = { id: string; name: string; email: string; role: string };

export type AuthResponse = { user: AuthUser };
