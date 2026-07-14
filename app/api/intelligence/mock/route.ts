import { createHash, randomUUID } from "node:crypto";
import { requireApprovedApiUser, noStoreJson } from "@/lib/server/api-auth";
import {
  loadIntelligenceState,
  saveIntelligenceState
} from "@/lib/server/intelligence-store";
import {
  mockFetchSignals,
  type MockSignal
} from "@/lib/server/mock-signal-fetcher";
import type {
  BusinessSignal,
  DecisionPriority,
  IntelligenceDecision,
  SignalCategory
} from "@/lib/intelligence-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOCK_PREFIX = "mock:";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function categoryFor(item: MockSignal): SignalCategory {
  if (item.source.includes("上海证券报")) return "risk";
  if (item.source.includes("竞品")) return "competitive";
  if (item.source.includes("行业论坛") || item.source.includes("流量")) {
    return "growth";
  }
  if (item.source.includes("库存")) return "operational";
  return "operational";
}

function scoreFor(level: MockSignal["level"]) {
  if (level === "high") return { impact: 88, confidence: 92 };
  if (level === "medium") return { impact: 68, confidence: 84 };
  return { impact: 45, confidence: 74 };
}

function priorityFor(level: MockSignal["level"]): DecisionPriority {
  return level;
}

function buildMockRecords(item: MockSignal, capturedAt: string) {
  const stableHash = hash(item.source + "\n" + item.title);
  const sourceId = MOCK_PREFIX + hash(item.source).slice(0, 16);
  const signalId = randomUUID();
  const scores = scoreFor(item.level);
  const signal: BusinessSignal = {
    id: signalId,
    sourceId,
    sourceName: item.source,
    fingerprint: MOCK_PREFIX + stableHash,
    contentHash: stableHash,
    title: item.title,
    summary: item.summary,
    category: categoryFor(item),
    impactScore: scores.impact,
    confidence: scores.confidence,
    sourceUrl: "",
    publishedAt: item.created_at,
    capturedAt: item.created_at,
    rawExcerpt: item.raw_content,
    rawData: item.raw_data,
    isMock: true,
    suggestion: item.suggestion,
    level: item.level,
    isRead: item.is_read
  };
  const decision: IntelligenceDecision = {
    id: randomUUID(),
    sourceId,
    signalId,
    title: "处理建议：" + item.title,
    rationale: item.summary,
    recommendedAction: item.suggestion,
    priority: priorityFor(item.level),
    confidence: scores.confidence,
    status: "proposed",
    createdAt: capturedAt,
    updatedAt: capturedAt,
    reviewedAt: null
  };

  return { signal, decision };
}

export async function POST() {
  try {
    const auth = await requireApprovedApiUser();
    if ("response" in auth) return auth.response;

    const mockSignals = await mockFetchSignals(auth.user.email);
    let state = await loadIntelligenceState(
      auth.session.subject,
      auth.user.email
    );
    const existingFingerprints = new Set(
      state.signals.map((signal) => signal.fingerprint)
    );
    const capturedAt = new Date().toISOString();
    const records = mockSignals
      .map((item) => buildMockRecords(item, capturedAt))
      .filter(({ signal }) => !existingFingerprints.has(signal.fingerprint));

    if (records.length) {
      state.signals = [
        ...records.map(({ signal }) => signal),
        ...state.signals
      ];
      state.decisions = [
        ...records.map(({ decision }) => decision),
        ...state.decisions
      ];
      state = await saveIntelligenceState(auth.session.subject, state);
    }

    return noStoreJson({ state, imported: records.length });
  } catch (error) {
    console.error("Import mock intelligence signals failed", error);
    return noStoreJson({ error: "载入演示信号失败" }, 500);
  }
}

export async function DELETE() {
  try {
    const auth = await requireApprovedApiUser();
    if ("response" in auth) return auth.response;

    let state = await loadIntelligenceState(
      auth.session.subject,
      auth.user.email
    );
    const mockSignalIds = new Set(
      state.signals
        .filter(
          (signal) =>
            signal.isMock || signal.fingerprint.startsWith(MOCK_PREFIX)
        )
        .map((signal) => signal.id)
    );
    const removed = mockSignalIds.size;

    if (removed) {
      state.signals = state.signals.filter(
        (signal) => !mockSignalIds.has(signal.id)
      );
      state.decisions = state.decisions.filter(
        (decision) =>
          !decision.sourceId.startsWith(MOCK_PREFIX) &&
          !mockSignalIds.has(decision.signalId)
      );
      state = await saveIntelligenceState(auth.session.subject, state);
    }

    return noStoreJson({ state, removed });
  } catch (error) {
    console.error("Clear mock intelligence signals failed", error);
    return noStoreJson({ error: "清除演示信号失败" }, 500);
  }
}
