import { noStoreJson } from "@/lib/server/api-auth";
import { runDueScans } from "@/lib/server/signal-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return noStoreJson({ error: "未授权" }, 401);
  }

  try {
    const results = await runDueScans(8);
    return noStoreJson({ success: true, scanned: results.length, results });
  } catch (error) {
    console.error("Scheduled signal scan failed", error);
    return noStoreJson({ error: "自动扫描失败" }, 500);
  }
}