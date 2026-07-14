import { requireApprovedApiUser, noStoreJson } from "@/lib/server/api-auth";
import {
  scanSourceAndUpdateState,
  SourceBlockedError,
  SourceFetchError
} from "@/lib/server/signal-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApprovedApiUser();
    if ("response" in auth) return auth.response;

    const { sourceId } = await context.params;
    const result = await scanSourceAndUpdateState(
      auth.session.subject,
      auth.user.email,
      sourceId
    );
    return noStoreJson({ state: result.state, createdSignal: result.created });
  } catch (error) {
    console.error("Manual source scan failed", error);
    const expected =
      error instanceof SourceBlockedError || error instanceof SourceFetchError;
    return noStoreJson(
      { error: expected ? error.message : "扫描信息来源失败" },
      expected ? 422 : 500
    );
  }
}