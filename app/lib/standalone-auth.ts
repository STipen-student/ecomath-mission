import { Auth, type AuthConfig } from "@auth/core";
import Google from "@auth/core/providers/google";

export type StandaloneAuthEnv = {
  AUTH_MODE?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  AUTH_SECRET?: string;
};

export type StandaloneUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

function runtimeEnv(): StandaloneAuthEnv {
  return (
    (globalThis as typeof globalThis & {
      __ECOMATH_ENV__?: StandaloneAuthEnv;
    }).__ECOMATH_ENV__ ?? {}
  );
}

export function isStandaloneAuth(): boolean {
  return runtimeEnv().AUTH_MODE === "standalone";
}

function authConfig(): AuthConfig {
  const env = runtimeEnv();
  if (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET || !env.AUTH_SECRET) {
    throw new Error(
      "Standalone authentication is not configured. Set AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, and AUTH_SECRET as Cloudflare Worker secrets.",
    );
  }

  return {
    basePath: "/api/auth",
    secret: env.AUTH_SECRET,
    trustHost: true,
    providers: [
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      }),
    ],
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider !== "google") return false;
        return Boolean(profile?.email && profile.email_verified !== false);
      },
    },
  };
}

export async function handleStandaloneAuth(request: Request): Promise<Response> {
  if (!isStandaloneAuth()) {
    return Response.json(
      { error: "Auth.js is disabled on the Sites deployment." },
      { status: 404 },
    );
  }

  try {
    return await Auth(request, authConfig());
  } catch (error) {
    console.error("Standalone Auth.js request failed", error);
    return Response.json(
      { error: "Google login has not been configured for this deployment." },
      { status: 503 },
    );
  }
}

export async function getStandaloneUser(
  requestHeaders: Headers,
): Promise<StandaloneUser | null> {
  if (!isStandaloneAuth()) return null;

  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const sessionRequest = new Request(
    `${protocol}://${host}/api/auth/session`,
    { headers: requestHeaders },
  );

  try {
    const response = await Auth(sessionRequest, authConfig());
    if (!response.ok) return null;
    const session = (await response.json()) as {
      user?: { email?: string | null; name?: string | null };
    };
    const email = session.user?.email?.trim();
    if (!email) return null;
    const fullName = session.user?.name?.trim() || null;
    return { email, fullName, displayName: fullName ?? email };
  } catch (error) {
    console.error("Unable to read standalone Auth.js session", error);
    return null;
  }
}

