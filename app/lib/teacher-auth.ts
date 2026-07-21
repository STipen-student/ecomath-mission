import { cookies } from "next/headers";

const COOKIE_NAME = "ecomath_teacher_session";
const SESSION_SECONDS = 60 * 60 * 10;

type RuntimeSecrets = {
  ECOMATH_TEACHER_USERNAME?: string;
  ECOMATH_TEACHER_PASSWORD_HASH?: string;
  ECOMATH_SESSION_SECRET?: string;
};

function secrets(): RuntimeSecrets {
  return ((globalThis as typeof globalThis & { __ECOMATH_ENV__?: RuntimeSecrets }).__ECOMATH_ENV__ ?? {});
}

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", bytes(value));
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function signature(email: string, expires: number) {
  const secret = secrets().ECOMATH_SESSION_SECRET;
  if (!secret) return "";
  const key = await crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, bytes(`${email}.${expires}`));
  return btoa(String.fromCharCode(...new Uint8Array(signed))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function verifyTeacherCredentials(username: string, password: string) {
  const config = secrets();
  if (!config.ECOMATH_TEACHER_USERNAME || !config.ECOMATH_TEACHER_PASSWORD_HASH || !config.ECOMATH_SESSION_SECRET) return false;
  const usernameMatches = username.trim().toLowerCase() === config.ECOMATH_TEACHER_USERNAME.toLowerCase();
  const passwordMatches = await sha256(password) === config.ECOMATH_TEACHER_PASSWORD_HASH;
  return usernameMatches && passwordMatches;
}

export async function createTeacherSession(email: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const token = `${expires}.${await signature(email, expires)}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV !== "development", sameSite: "strict", path: "/", maxAge: SESSION_SECONDS });
}

export async function hasTeacherSession(email: string) {
  const token = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  const [expiresText, supplied] = token.split(".");
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000) || !supplied) return false;
  const expected = await signature(email, expires);
  if (!expected || expected.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  return difference === 0;
}

export async function clearTeacherSession() {
  (await cookies()).delete(COOKIE_NAME);
}
