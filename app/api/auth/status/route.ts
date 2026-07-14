import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  findApplicationUser,
  getSession
} from "@/lib/server/auth";
import { ConfigurationError } from "@/lib/server/registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      const result = response({ authenticated: false }, 401);
      clearSessionCookie(result);
      return result;
    }

    const { data: user, error } = await findApplicationUser(session.email);

    if (error) {
      console.error("Registration status lookup failed", error.message);
      return response({ error: "暂时无法查询审核状态" }, 503);
    }

    if (!user) {
      const result = response({ authenticated: false }, 401);
      clearSessionCookie(result);
      return result;
    }

    return response(
      {
        authenticated: true,
        email: user.email,
        approved: user.status === "approved",
        status: user.status,
        redirectTo: user.status === "approved" ? "/workspace" : null
      },
      200
    );
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return response({ error: "登录服务暂未配置" }, 503);
    }

    console.error("Registration status request failed", error);
    return response({ error: "服务器错误，请稍后重试" }, 500);
  }
}