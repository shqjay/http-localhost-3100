import { requireApprovedApiUser, noStoreJson } from "@/lib/server/api-auth";
import {
  loadIntelligenceState,
  saveIntelligenceState
} from "@/lib/server/intelligence-store";
import type { DecisionStatus } from "@/lib/intelligence-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ decisionId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApprovedApiUser();
    if ("response" in auth) return auth.response;

    const payload = (await request.json().catch(() => ({}))) as {
      status?: unknown;
    };
    const status: DecisionStatus | null =
      payload.status === "approved" || payload.status === "dismissed"
        ? payload.status
        : null;
    if (!status) return noStoreJson({ error: "决策状态无效" }, 400);

    const { decisionId } = await context.params;
    let state = await loadIntelligenceState(
      auth.session.subject,
      auth.user.email
    );
    const exists = state.decisions.some((decision) => decision.id === decisionId);
    if (!exists) return noStoreJson({ error: "没有找到该决策建议" }, 404);

    const now = new Date().toISOString();
    state.decisions = state.decisions.map((decision) =>
      decision.id === decisionId
        ? { ...decision, status, updatedAt: now, reviewedAt: now }
        : decision
    );
    state = await saveIntelligenceState(auth.session.subject, state);
    return noStoreJson({ state });
  } catch (error) {
    console.error("Review intelligence decision failed", error);
    return noStoreJson({ error: "更新决策状态失败" }, 500);
  }
}