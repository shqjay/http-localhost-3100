import "server-only";

import { NextResponse } from "next/server";
import { getCurrentApplicationUser } from "@/lib/server/auth";

export async function requireApprovedApiUser() {
  const { session, user } = await getCurrentApplicationUser();

  if (!session || !user) {
    return {
      response: NextResponse.json(
        { error: "请先登录" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      )
    } as const;
  }

  if (user.status !== "approved") {
    return {
      response: NextResponse.json(
        { error: "账户尚未通过审核" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      )
    } as const;
  }

  return { session, user } as const;
}

export function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}