import { requireApprovedApiUser, noStoreJson } from "@/lib/server/api-auth";
import {
  loadIntelligenceState,
  saveIntelligenceState
} from "@/lib/server/intelligence-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApprovedApiUser();
    if ("response" in auth) return auth.response;

    const { sourceId } = await context.params;
    let state = await loadIntelligenceState(
      auth.session.subject,
      auth.user.email
    );
    const exists = state.sources.some((source) => source.id === sourceId);
    if (!exists) return noStoreJson({ error: "没有找到该信息来源" }, 404);

    const signalIds = new Set(
      state.signals
        .filter((signal) => signal.sourceId === sourceId)
        .map((signal) => signal.id)
    );
    state.sources = state.sources.filter((source) => source.id !== sourceId);
    state.signals = state.signals.filter((signal) => signal.sourceId !== sourceId);
    state.decisions = state.decisions.filter(
      (decision) =>
        decision.sourceId !== sourceId && !signalIds.has(decision.signalId)
    );
    state = await saveIntelligenceState(auth.session.subject, state);
    return noStoreJson({ state });
  } catch (error) {
    console.error("Delete intelligence source failed", error);
    return noStoreJson({ error: "删除信息来源失败" }, 500);
  }
}