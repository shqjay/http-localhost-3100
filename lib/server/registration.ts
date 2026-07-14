import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import {
  createClient,
  type SupabaseClient
} from "@supabase/supabase-js";
import { Resend } from "resend";

export type RegistrationStatus = "pending" | "approved" | "rejected";
export type ReviewAction = "approve" | "reject";

export class ConfigurationError extends Error {}
export class ForbiddenOriginError extends Error {}

export const QQ_EMAIL_PATTERN = /^\d{5,12}@qq\.com$/;

let supabaseAdmin: SupabaseClient | undefined;
let resendClient: Resend | undefined;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ConfigurationError("缺少服务器环境变量：" + name);
  }

  return value;
}

export function normalizeQqEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidQqEmail(email: string) {
  return QQ_EMAIL_PATTERN.test(email);
}

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  return supabaseAdmin;
}

export function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(requiredEnv("RESEND_API_KEY"));
  }

  return resendClient;
}

export function getEmailConfig() {
  return {
    adminEmail: requiredEnv("ADMIN_EMAIL"),
    fromEmail: requiredEnv("RESEND_FROM_EMAIL")
  };
}

export function getApplicationUrl() {
  const configuredUrl =
    process.env.APP_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  return vercelUrl
    ? "https://" + vercelUrl.replace(/\/$/, "")
    : "http://localhost:3000";
}

function actionPayload(
  email: string,
  action: ReviewAction,
  expires: number
) {
  return [email, action, String(expires)].join(":");
}

function signAdminAction(
  email: string,
  action: ReviewAction,
  expires: number
) {
  const secret = requiredEnv("ADMIN_ACTION_SECRET");

  if (secret.length < 32) {
    throw new ConfigurationError(
      "ADMIN_ACTION_SECRET 至少需要 32 个字符"
    );
  }

  return createHmac("sha256", secret)
    .update(actionPayload(email, action, expires))
    .digest("hex");
}

export function buildAdminActionUrl(
  email: string,
  action: ReviewAction,
  expires: number
) {
  const searchParams = new URLSearchParams({
    email,
    action,
    expires: String(expires),
    signature: signAdminAction(email, action, expires)
  });

  return (
    getApplicationUrl() +
    "/api/admin/approve?" +
    searchParams.toString()
  );
}

export function verifyAdminAction(input: {
  email: string;
  action: ReviewAction;
  expires: number;
  signature: string;
}) {
  if (!Number.isSafeInteger(input.expires)) {
    return false;
  }

  if (input.expires < Math.floor(Date.now() / 1000)) {
    return false;
  }

  if (!/^[a-f0-9]{64}$/i.test(input.signature)) {
    return false;
  }

  const expected = signAdminAction(
    input.email,
    input.action,
    input.expires
  );
  const receivedBuffer = Buffer.from(input.signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function getCorsHeaders(
  request: Request
): Record<string, string> {
  const origin = request.headers.get("origin");

  if (!origin) {
    return {};
  }

  const allowedOrigins = new Set([
    "https://shqjay.github.io",
    "https://http-localhost-3100.vercel.app",
    "http://localhost:3000",
    "http://localhost:3100",
    "http://localhost:3101"
  ]);

  const applicationUrl = getApplicationUrl();
  try {
    allowedOrigins.add(new URL(applicationUrl).origin);
  } catch {
    throw new ConfigurationError("APP_URL 不是有效网址");
  }

  for (const configuredOrigin of (
    process.env.ALLOWED_ORIGINS ?? ""
  ).split(",")) {
    const normalizedOrigin = configuredOrigin.trim();
    if (normalizedOrigin) {
      allowedOrigins.add(normalizedOrigin);
    }
  }

  if (!allowedOrigins.has(origin)) {
    throw new ForbiddenOriginError("请求来源不被允许");
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

export function buildAdminEmailHtml(input: {
  email: string;
  approveUrl: string;
  rejectUrl: string;
  requestedAt: string;
}) {
  return [
    '<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.6">',
    "<h2>有新用户申请使用 AstraOS</h2>",
    "<p><strong>QQ 邮箱：</strong>" + input.email + "</p>",
    "<p><strong>申请时间：</strong>" + input.requestedAt + "</p>",
    '<p style="margin-top:24px">',
    '<a href="' + input.approveUrl + '" style="display:inline-block;padding:10px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:6px">同意申请</a>',
    '<span style="display:inline-block;width:12px"></span>',
    '<a href="' + input.rejectUrl + '" style="display:inline-block;padding:10px 18px;border:1px solid #d1d5db;color:#374151;text-decoration:none;border-radius:6px">拒绝申请</a>',
    "</p>",
    '<p style="margin-top:24px;color:#6b7280;font-size:12px">审核链接 7 天内有效，请勿转发。</p>',
    "</div>"
  ].join("");
}