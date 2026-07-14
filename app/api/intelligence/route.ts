import { randomUUID } from "node:crypto";
import { requireApprovedApiUser, noStoreJson } from "@/lib/server/api-auth";
import {
  loadIntelligenceState,
  MAX_SOURCES,
  saveIntelligenceState
} from "@/lib/server/intelligence-store";
import {
  scanSourceAndUpdateState,
  SourceBlockedError,
  validateSourceUrl
} from "@/lib/server/signal-engine";
import type { SignalSource, SourceKind } from "@/lib/intelligence-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const auth = await requireApprovedApiUser();
    if ("response" in auth) return auth.response;

    const state = await loadIntelligenceState(
      auth.session.subject,
      auth.user.email
    );
    return noStoreJson({ state });
  } catch (error) {
    console.error("Intelligence state request failed", error);
    return noStoreJson({ error: "暂时无法读取业务情报" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedApiUser();
    if ("response" in auth) return auth.response;

    const payload = (await request.json().catch(() => ({}))) as {
      name?: unknown;
      url?: unknown;
      kind?: unknown;
      scanIntervalHours?: unknown;
    };
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const rawUrl = typeof payload.url === "string" ? payload.url.trim() : "";
    const kind: SourceKind =
      payload.kind === "rss" || payload.kind === "json"
        ? payload.kind
        : "website";
    const scanIntervalHours = Number(payload.scanIntervalHours ?? 24);

    if (!name || name.length > 80) {
      return noStoreJson({ error: "来源名称应为 1-80 个字符" }, 400);
    }

    if (
      !Number.isInteger(scanIntervalHours) ||
      scanIntervalHours < 6 ||
      scanIntervalHours > 168
    ) {
      return noStoreJson({ error: "自动扫描间隔应为 6-168 小时" }, 400);
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = (await validateSourceUrl(rawUrl)).toString();
    } catch (error) {
      const message = error instanceof Error ? error.message : "网址无效";
      return noStoreJson({ error: message }, 400);
    }

    let state = await loadIntelligenceState(
      auth.session.subject,
      auth.user.email
    );
    if (state.sources.length >= MAX_SOURCES) {
      return noStoreJson(
        { error: "当前私测版最多添加 " + MAX_SOURCES + " 个信息来源" },
        409
      );
    }

    if (state.sources.some((source) => source.url === normalizedUrl)) {
      return noStoreJson({ error: "这个信息来源已经存在" }, 409);
    }

    const now = new Date().toISOString();
    const source: SignalSource = {
      id: randomUUID(),
      name,
      url: normalizedUrl,
      kind,
      active: true,
      scanIntervalHours,
      createdAt: now,
      updatedAt: now,
      lastScannedAt: null,
      lastScanStatus: "idle",
      lastError: null,
      lastContentHash: null
    };
    state.sources = [source, ...state.sources];
    state = await saveIntelligenceState(auth.session.subject, state);

    let warning: string | null = null;
    let createdSignal = false;
    try {
      const result = await scanSourceAndUpdateState(
        auth.session.subject,
        auth.user.email,
        source.id
      );
      state = result.state;
      createdSignal = result.created;
    } catch (error) {
      warning =
        error instanceof Error ? error.message : "首次扫描暂时没有完成";
      state = await loadIntelligenceState(
        auth.session.subject,
        auth.user.email
      );
    }

    return noStoreJson({ state, createdSignal, warning }, 201);
  } catch (error) {
    console.error("Create intelligence source failed", error);
    const message =
      error instanceof SourceBlockedError ? error.message : "添加信息来源失败";
    return noStoreJson({ error: message }, 500);
  }
}