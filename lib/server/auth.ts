import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import {
  ConfigurationError,
  getSupabaseAdmin,
  normalizeQqEmail,
  type RegistrationStatus
} from "@/lib/server/registration";

export const AUTH_COOKIE_NAME = "astra_session";
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 72;

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{10,72}$/;

type SessionPayload = {
  version: 1;
  subject: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
};

export type ApplicationUser = {
  id: string;
  email: string;
  status: RegistrationStatus;
};

export class InvalidCredentialsError extends Error {}
export class AuthenticationServiceError extends Error {}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ConfigurationError("缺少服务器环境变量：" + name);
  }

  return value;
}

function getSessionSecret() {
  const secret =
    process.env.AUTH_SESSION_SECRET?.trim() ||
    process.env.ADMIN_ACTION_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new ConfigurationError(
      "AUTH_SESSION_SECRET 或 ADMIN_ACTION_SECRET 至少需要 32 个字符"
    );
  }

  return secret;
}

function signSessionPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update("astra-session:" + encodedPayload)
    .digest("base64url");
}

export function isValidPassword(password: string) {
  return PASSWORD_PATTERN.test(password);
}

export function createSessionToken(subject: string, email: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    version: 1,
    subject,
    email: normalizeQqEmail(email),
    issuedAt,
    expiresAt: issuedAt + SESSION_MAX_AGE_SECONDS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  return encodedPayload + "." + signSessionPayload(encodedPayload);
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return null;

  const [encodedPayload, receivedSignature, ...rest] = token.split(".");
  if (!encodedPayload || !receivedSignature || rest.length > 0) return null;

  const expectedSignature = signSessionPayload(encodedPayload);
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;

    if (
      payload.version !== 1 ||
      typeof payload.subject !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    const email = normalizeQqEmail(payload.email);
    if (!email) return null;

    return { ...payload, email } as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  subject: string,
  email: string
) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: createSessionToken(subject, email),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function findApplicationUser(email: string) {
  return getSupabaseAdmin()
    .from("users")
    .select("id, email, status")
    .eq("email", normalizeQqEmail(email))
    .maybeSingle<ApplicationUser>();
}

export async function getCurrentApplicationUser() {
  const session = await getSession();
  if (!session) return { session: null, user: null };

  const { data: user, error } = await findApplicationUser(session.email);
  if (error) {
    console.error("Application session lookup failed", error.message);
    return { session, user: null };
  }

  return { session, user };
}

async function findAuthUserByEmail(email: string) {
  const normalizedEmail = normalizeQqEmail(email);
  const perPage = 1000;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw new AuthenticationServiceError(error.message);
    }

    const user = data.users.find(
      (candidate) => normalizeQqEmail(candidate.email) === normalizedEmail
    );

    if (user) return user;
    if (data.users.length < perPage) return null;
  }

  throw new AuthenticationServiceError("用户目录超过可查询范围");
}

function createPasswordClient() {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );
}

async function verifyPassword(email: string, password: string) {
  const { data, error } = await createPasswordClient().auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    throw new InvalidCredentialsError("邮箱或密码不正确");
  }

  return data.user;
}

export async function authenticateOrCreateUser(
  email: string,
  password: string
): Promise<{ user: User; created: boolean }> {
  const existingUser = await findAuthUserByEmail(email);

  if (existingUser) {
    return {
      user: await verifyPassword(email, password),
      created: false
    };
  }

  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error || !data.user) {
    const concurrentUser = await findAuthUserByEmail(email);
    if (concurrentUser) {
      return {
        user: await verifyPassword(email, password),
        created: false
      };
    }

    throw new AuthenticationServiceError(
      error?.message || "无法创建登录账户"
    );
  }

  return { user: data.user, created: true };
}

export async function deleteAuthUser(userId: string) {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
  if (error) {
    console.error("Supabase auth rollback failed", error.message);
  }
}