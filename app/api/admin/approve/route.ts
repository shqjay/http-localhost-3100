import { NextResponse } from "next/server";
import {
  ConfigurationError,
  getSupabaseAdmin,
  isValidQqEmail,
  normalizeQqEmail,
  verifyAdminAction,
  type ReviewAction
} from "@/lib/server/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewInput = {
  email: string;
  action: ReviewAction;
  expires: number;
  signature: string;
};

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function document(
  title: string,
  content: string,
  status: number
) {
  const body = [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "<title>" + htmlEscape(title) + " | AstraOS</title>",
    "<style>",
    "body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050816;color:#fff;font-family:Inter,Arial,sans-serif;padding:24px;box-sizing:border-box}",
    "main{width:min(440px,100%);border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);padding:32px;border-radius:12px;box-sizing:border-box}",
    "h1{font-size:22px;margin:0 0 12px}p{margin:0;color:#94a3b8;line-height:1.7}",
    "form{margin-top:24px}button{width:100%;height:46px;border:0;border-radius:7px;background:#fff;color:#050816;font-weight:700;cursor:pointer}",
    "</style>",
    "</head>",
    "<body><main>",
    content,
    "</main></body></html>"
  ].join("");

  return new NextResponse(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function messagePage(
  title: string,
  message: string,
  status: number
) {
  return document(
    title,
    "<h1>" +
      htmlEscape(title) +
      "</h1><p>" +
      htmlEscape(message) +
      "</p>",
    status
  );
}

function confirmationPage(input: ReviewInput) {
  const title =
    input.action === "approve" ? "确认同意申请" : "确认拒绝申请";
  const button =
    input.action === "approve" ? "确认同意" : "确认拒绝";

  const content = [
    "<h1>" + htmlEscape(title) + "</h1>",
    "<p>申请邮箱：" + htmlEscape(input.email) + "</p>",
    '<form method="post" action="/api/admin/approve">',
    '<input type="hidden" name="email" value="' +
      htmlEscape(input.email) +
      '">',
    '<input type="hidden" name="action" value="' +
      htmlEscape(input.action) +
      '">',
    '<input type="hidden" name="expires" value="' +
      String(input.expires) +
      '">',
    '<input type="hidden" name="signature" value="' +
      htmlEscape(input.signature) +
      '">',
    "<button type=\"submit\">" + htmlEscape(button) + "</button>",
    "</form>"
  ].join("");

  return document(title, content, 200);
}

function parseReviewInput(values: {
  email: unknown;
  action: unknown;
  expires: unknown;
  signature: unknown;
}): ReviewInput | null {
  const email = normalizeQqEmail(values.email);
  const action = values.action;
  const expires = Number(values.expires);
  const signature =
    typeof values.signature === "string"
      ? values.signature
      : "";

  if (
    !isValidQqEmail(email) ||
    (action !== "approve" && action !== "reject") ||
    !Number.isSafeInteger(expires)
  ) {
    return null;
  }

  return {
    email,
    action,
    expires,
    signature
  };
}

function validateReviewInput(input: ReviewInput) {
  try {
    return verifyAdminAction(input);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return null;
    }

    throw error;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input = parseReviewInput({
    email: url.searchParams.get("email"),
    action: url.searchParams.get("action"),
    expires: url.searchParams.get("expires"),
    signature: url.searchParams.get("signature")
  });

  if (!input) {
    return messagePage(
      "链接无效",
      "审核参数不完整或格式错误。",
      400
    );
  }

  const valid = validateReviewInput(input);

  if (valid === null) {
    return messagePage(
      "服务未配置",
      "请先配置服务器环境变量。",
      503
    );
  }

  if (!valid) {
    return messagePage(
      "链接无效",
      "审核链接已过期或签名不正确。",
      403
    );
  }

  return confirmationPage(input);
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return messagePage("请求无效", "无法读取审核请求。", 400);
  }

  const input = parseReviewInput({
    email: formData.get("email"),
    action: formData.get("action"),
    expires: formData.get("expires"),
    signature: formData.get("signature")
  });

  if (!input) {
    return messagePage(
      "请求无效",
      "审核参数不完整或格式错误。",
      400
    );
  }

  try {
    if (!verifyAdminAction(input)) {
      return messagePage(
        "链接无效",
        "审核链接已过期或签名不正确。",
        403
      );
    }

    const nextStatus =
      input.action === "approve" ? "approved" : "rejected";
    const { data, error } = await getSupabaseAdmin()
      .from("users")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq("email", input.email)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Supabase review update failed", error.message);
      return messagePage(
        "处理失败",
        "数据库暂时不可用，请稍后重试。",
        503
      );
    }

    if (!data) {
      return messagePage(
        "未找到申请",
        "对应的注册申请不存在。",
        404
      );
    }

    return messagePage(
      input.action === "approve"
        ? "申请已同意"
        : "申请已拒绝",
      input.email + " 的状态已经更新。",
      200
    );
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return messagePage(
        "服务未配置",
        "请先配置服务器环境变量。",
        503
      );
    }

    console.error("Admin review request failed", error);
    return messagePage("服务器错误", "请稍后重试。", 500);
  }
}