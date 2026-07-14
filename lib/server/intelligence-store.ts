import "server-only";

import { getSupabaseAdmin } from "@/lib/server/registration";
import type { IntelligenceState } from "@/lib/intelligence-types";

const INTELLIGENCE_BUCKET = "astra-intelligence";
const MAX_SOURCES = 8;
const MAX_SIGNALS = 100;
const MAX_DECISIONS = 100;

let bucketReady = false;

function statePath(subject: string) {
  return "accounts/" + subject + "/state.json";
}

export function createEmptyIntelligenceState(email: string): IntelligenceState {
  return {
    version: 1,
    email,
    sources: [],
    signals: [],
    decisions: [],
    updatedAt: new Date().toISOString()
  };
}

export async function ensureIntelligenceBucket() {
  if (bucketReady) return;

  const storage = getSupabaseAdmin().storage;
  const { data } = await storage.getBucket(INTELLIGENCE_BUCKET);

  if (!data) {
    const { error: createError } = await storage.createBucket(
      INTELLIGENCE_BUCKET,
      {
        public: false,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ["application/json"]
      }
    );

    if (
      createError &&
      !createError.message.toLowerCase().includes("already exists")
    ) {
      throw new Error("无法创建情报数据存储：" + createError.message);
    }
  }

  bucketReady = true;
}

function normalizeState(
  value: Partial<IntelligenceState>,
  fallbackEmail: string
): IntelligenceState {
  return {
    version: 1,
    email: typeof value.email === "string" ? value.email : fallbackEmail,
    sources: Array.isArray(value.sources)
      ? value.sources.slice(0, MAX_SOURCES)
      : [],
    signals: Array.isArray(value.signals)
      ? value.signals.slice(0, MAX_SIGNALS)
      : [],
    decisions: Array.isArray(value.decisions)
      ? value.decisions.slice(0, MAX_DECISIONS)
      : [],
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString()
  };
}

export async function loadIntelligenceState(
  subject: string,
  email = ""
): Promise<IntelligenceState> {
  await ensureIntelligenceBucket();

  const { data, error } = await getSupabaseAdmin()
    .storage.from(INTELLIGENCE_BUCKET)
    .download(statePath(subject));

  if (error || !data) {
    const status = String(
      (error as { statusCode?: string | number } | null)?.statusCode ?? ""
    );
    const missing =
      status === "404" ||
      error?.message.toLowerCase().includes("not found") ||
      error?.message.toLowerCase().includes("does not exist");

    if (missing || !error) return createEmptyIntelligenceState(email);
    throw new Error("无法读取情报数据：" + error.message);
  }

  try {
    const parsed = JSON.parse(await data.text()) as Partial<IntelligenceState>;
    return normalizeState(parsed, email);
  } catch {
    throw new Error("情报数据格式无效");
  }
}

export async function saveIntelligenceState(
  subject: string,
  state: IntelligenceState
) {
  await ensureIntelligenceBucket();

  const normalized: IntelligenceState = {
    ...state,
    version: 1,
    sources: state.sources.slice(0, MAX_SOURCES),
    signals: state.signals.slice(0, MAX_SIGNALS),
    decisions: state.decisions.slice(0, MAX_DECISIONS),
    updatedAt: new Date().toISOString()
  };
  const payload = JSON.stringify(normalized);
  const { error } = await getSupabaseAdmin()
    .storage.from(INTELLIGENCE_BUCKET)
    .upload(statePath(subject), payload, {
      upsert: true,
      cacheControl: "0",
      contentType: "application/json"
    });

  if (error) throw new Error("无法保存情报数据：" + error.message);
  return normalized;
}

export async function listIntelligenceAccounts() {
  await ensureIntelligenceBucket();

  const { data, error } = await getSupabaseAdmin()
    .storage.from(INTELLIGENCE_BUCKET)
    .list("accounts", {
      limit: 100,
      sortBy: { column: "name", order: "asc" }
    });

  if (error) throw new Error("无法列出情报账户：" + error.message);
  return (data ?? []).map((entry) => entry.name).filter(Boolean);
}

export { INTELLIGENCE_BUCKET, MAX_SOURCES };