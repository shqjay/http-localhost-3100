import { NextResponse } from "next/server";
import {
  AuthenticationServiceError,
  authenticateOrCreateUser,
  deleteAuthUser,
  findApplicationUser,
  InvalidCredentialsError,
  isValidPassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  setSessionCookie
} from "@/lib/server/auth";
import {
  buildAdminActionUrl,
  buildAdminEmailHtml,
  ConfigurationError,
  ForbiddenOriginError,
  getCorsHeaders,
  getEmailConfig,
  getResendClient,
  getSupabaseAdmin,
  isValidQqEmail,
  normalizeQqEmail
} from "@/lib/server/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>
) {
  return NextResponse.json(body, { status, headers });
}

function jsonWithSession(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
  subject: string,
  email: string
) {
  const response = json(body, status, headers);
  setSessionCookie(response, subject, email);
  return response;
}

function withErrorCode(
  headers: Record<string, string>,
  code: string | undefined
) {
  return {
    ...headers,
    "X-AstraOS-Error-Code": code || "unknown"
  };
}

function getRequestHeaders(request: Request) {
  try {
    return getCorsHeaders(request);
  } catch (error) {
    if (error instanceof ForbiddenOriginError) return null;
    throw error;
  }
}

function statusPayload(status: "pending" | "approved" | "rejected") {
  return {
    success: true,
    approved: status === "approved",
    status,
    redirectTo: status === "approved" ? "/workspace" : null
  };
}

async function sendAdminReviewNotification(email: string) {
  const expires = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const approveUrl = buildAdminActionUrl(email, "approve", expires);
  const rejectUrl = buildAdminActionUrl(email, "reject", expires);
  const { adminEmail, fromEmail } = getEmailConfig();
  const requestedAt = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Shanghai"
  }).format(new Date());

  const { error } = await getResendClient().emails.send({
    from: fromEmail,
    to: [adminEmail],
    subject: "【AstraOS】新用户注册待审核：" + email,
    html: buildAdminEmailHtml({
      email,
      approveUrl,
      rejectUrl,
      requestedAt
    })
  });

  return error;
}
export function OPTIONS(request: Request) {
  try {
    const headers = getRequestHeaders(request);

    if (!headers) return new NextResponse(null, { status: 403 });
    return new NextResponse(null, { status: 204, headers });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}

export async function POST(request: Request) {
  let headers: Record<string, string>;

  try {
    const requestHeaders = getRequestHeaders(request);

    if (!requestHeaders) {
      return NextResponse.json(
        { error: "请求来源不被允许" },
        { status: 403 }
      );
    }

    headers = requestHeaders;
  } catch (error) {
    console.error("Registration CORS configuration failed", error);
    return NextResponse.json(
      { error: "注册服务暂未配置" },
      { status: 503 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "请求格式无效" }, 400, headers);
  }

  const input =
    typeof payload === "object" && payload !== null
      ? (payload as { email?: unknown; password?: unknown })
      : {};
  const email = normalizeQqEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";

  if (!email) return json({ error: "邮箱不能为空" }, 400, headers);

  if (!isValidQqEmail(email)) {
    return json({ error: "请输入有效的 QQ 邮箱" }, 400, headers);
  }

  if (!isValidPassword(password)) {
    return json(
      {
        error:
          "密码需为 " +
          PASSWORD_MIN_LENGTH +
          "-" +
          PASSWORD_MAX_LENGTH +
          " 位，并同时包含字母和数字"
      },
      400,
      headers
    );
  }

  try {
    const { data: existingUser, error: lookupError } =
      await findApplicationUser(email);

    if (lookupError) {
      console.error("Supabase user lookup failed", lookupError.message);
      return json(
        { error: "注册服务暂时不可用" },
        503,
        withErrorCode(headers, lookupError.code)
      );
    }

    let authResult: Awaited<ReturnType<typeof authenticateOrCreateUser>>;

    try {
      authResult = await authenticateOrCreateUser(email, password);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return json({ error: "邮箱或密码不正确" }, 401, headers);
      }

      if (error instanceof AuthenticationServiceError) {
        console.error("Supabase authentication failed", error.message);
        return json({ error: "登录服务暂时不可用" }, 503, headers);
      }

      throw error;
    }

    if (existingUser) {
      if (existingUser.status === "pending" && authResult.created) {
        const emailError = await sendAdminReviewNotification(email);

        if (emailError) {
          console.error("Resend notification failed", emailError.message);
          await deleteAuthUser(authResult.user.id);
          return json(
            { error: "审核通知发送失败，请稍后重试" },
            502,
            headers
          );
        }
      }

      return jsonWithSession(
        statusPayload(existingUser.status),
        200,
        headers,
        authResult.user.id,
        email
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ email, status: "pending" })
      .select("id, email, status")
      .single<{ id: string; email: string; status: "pending" }>();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: concurrentUser } = await findApplicationUser(email);

        if (concurrentUser) {
          return jsonWithSession(
            statusPayload(concurrentUser.status),
            200,
            headers,
            authResult.user.id,
            email
          );
        }
      }

      if (authResult.created) await deleteAuthUser(authResult.user.id);
      console.error("Supabase user insert failed", insertError.message);
      return json(
        { error: "注册失败，请稍后重试" },
        500,
        withErrorCode(headers, insertError.code)
      );
    }

    const emailError = await sendAdminReviewNotification(email);

    if (emailError) {
      console.error("Resend notification failed", emailError.message);
      const { error: rollbackError } = await supabase
        .from("users")
        .delete()
        .eq("id", newUser.id);

      if (rollbackError) {
        console.error("Registration rollback failed", rollbackError.message);
      }

      if (authResult.created) await deleteAuthUser(authResult.user.id);
      return json({ error: "通知发送失败，请稍后重试" }, 502, headers);
    }

    return jsonWithSession(
      statusPayload("pending"),
      201,
      headers,
      authResult.user.id,
      email
    );
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error("Registration service is not configured");
      return json({ error: "注册服务暂未配置" }, 503, headers);
    }

    console.error("Registration request failed", error);
    return json({ error: "服务器错误，请稍后重试" }, 500, headers);
  }
}