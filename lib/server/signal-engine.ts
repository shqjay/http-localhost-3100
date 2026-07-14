import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import type {
  BusinessSignal,
  DecisionPriority,
  IntelligenceDecision,
  IntelligenceState,
  SignalCategory,
  SignalSource
} from "@/lib/intelligence-types";
import {
  listIntelligenceAccounts,
  loadIntelligenceState,
  saveIntelligenceState
} from "@/lib/server/intelligence-store";
import { findApplicationUser } from "@/lib/server/auth";

const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 12_000;
const BOT_NAME = "astraos-signalbot";

export class SourceBlockedError extends Error {}
export class SourceFetchError extends Error {}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
  );
}

function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export async function validateSourceUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new SourceBlockedError("请输入有效的网址");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SourceBlockedError("仅支持 HTTP 或 HTTPS 公开网址");
  }

  if (url.username || url.password) {
    throw new SourceBlockedError("网址不能包含用户名或密码");
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new SourceBlockedError("仅允许标准的 80 或 443 端口");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const blockedHost =
    hostname === "localhost" ||
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home");

  if (blockedHost) throw new SourceBlockedError("不能抓取本机或内部网络地址");

  const directIpVersion = isIP(hostname);
  if (directIpVersion && isPrivateAddress(hostname)) {
    throw new SourceBlockedError("不能抓取私有或保留 IP 地址");
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new SourceBlockedError("网址解析到了不可访问的网络地址");
    }
  } catch (error) {
    if (error instanceof SourceBlockedError) throw error;
    throw new SourceFetchError("无法解析该网址的域名");
  }

  url.hash = "";
  return url;
}

async function readLimitedText(response: Response) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new SourceFetchError("页面内容超过 1.5 MB 限制");
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new SourceFetchError("页面内容超过 1.5 MB 限制");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(merged);
}

async function fetchWithRedirects(initialUrl: URL, accept: string) {
  let currentUrl = initialUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await validateSourceUrl(currentUrl.toString());
    let response: Response;

    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          Accept: accept,
          "User-Agent":
            "AstraOS-SignalBot/1.0 (+https://http-localhost-3100.vercel.app/)"
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络请求失败";
      throw new SourceFetchError("抓取失败：" + message.slice(0, 180));
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new SourceFetchError("页面重定向缺少目标地址");
      if (redirect === MAX_REDIRECTS) {
        throw new SourceFetchError("页面重定向次数过多");
      }
      currentUrl = await validateSourceUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new SourceFetchError("来源返回 HTTP " + response.status);
    }

    return { response, finalUrl: currentUrl };
  }

  throw new SourceFetchError("无法完成页面抓取");
}

function robotsAllows(content: string, pathname: string) {
  const rules: Array<{ type: "allow" | "disallow"; path: string }> = [];
  let groupApplies = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0]?.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      groupApplies = agent === "*" || agent.includes(BOT_NAME);
    } else if (groupApplies && (key === "allow" || key === "disallow")) {
      if (value) rules.push({ type: key, path: value });
    }
  }

  const matches = rules
    .filter((rule) => pathname.startsWith(rule.path.replace(/\*.*$/, "")))
    .sort((a, b) => b.path.length - a.path.length);

  if (!matches.length) return true;
  return matches[0].type === "allow";
}

async function assertRobotsAllowed(target: URL) {
  const robotsUrl = new URL("/robots.txt", target.origin);

  try {
    const { response } = await fetchWithRedirects(robotsUrl, "text/plain");
    const content = await readLimitedText(response);
    if (!robotsAllows(content, target.pathname || "/")) {
      throw new SourceBlockedError("该网站的 robots.txt 不允许抓取此路径");
    }
  } catch (error) {
    if (error instanceof SourceBlockedError) throw error;
    // Missing or unavailable robots.txt does not prohibit public-page monitoring.
  }
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parsePublishedAt(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractHtml(content: string, finalUrl: URL) {
  const $ = cheerio.load(content);
  $("script,style,noscript,svg,form,nav,footer,header").remove();
  const title = normalizeText(
    $("meta[property='og:title']").attr("content") ||
      $("title").text() ||
      $("h1").first().text() ||
      finalUrl.hostname
  );
  const description = normalizeText(
    $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      ""
  );
  const mainText = normalizeText(
    $("article").first().text() ||
      $("main").first().text() ||
      $("body").text()
  );
  const combined = normalizeText([description, mainText].filter(Boolean).join(" "));
  const publishedAt = parsePublishedAt(
    $("meta[property='article:published_time']").attr("content") ||
      $("time[datetime]").first().attr("datetime")
  );

  return {
    title: title.slice(0, 300),
    text: combined.slice(0, 16_000),
    publishedAt
  };
}

function extractFeed(content: string, finalUrl: URL) {
  const $ = cheerio.load(content, { xmlMode: true });
  const item = $("item").first().length
    ? $("item").first()
    : $("entry").first();
  const title = normalizeText(item.find("title").first().text()) || finalUrl.hostname;
  const text = normalizeText(
    item.find("description,summary,content").first().text() || item.text()
  );
  const link =
    item.find("link").first().attr("href") ||
    item.find("link").first().text() ||
    finalUrl.toString();
  const publishedAt = parsePublishedAt(
    item.find("pubDate,published,updated").first().text()
  );

  return {
    title: title.slice(0, 300),
    text: text.slice(0, 16_000),
    publishedAt,
    itemUrl: new URL(link, finalUrl).toString()
  };
}

function extractJson(content: string, finalUrl: URL) {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new SourceFetchError("JSON 来源格式无效");
  }

  const root = Array.isArray(value) ? value[0] : value;
  const record =
    typeof root === "object" && root !== null
      ? (root as Record<string, unknown>)
      : {};
  const titleValue = record.title ?? record.name ?? finalUrl.hostname;
  const title = normalizeText(String(titleValue));
  const text = normalizeText(JSON.stringify(root));

  return {
    title: title.slice(0, 300),
    text: text.slice(0, 16_000),
    publishedAt: parsePublishedAt(
      typeof record.published_at === "string"
        ? record.published_at
        : typeof record.date === "string"
          ? record.date
          : undefined
    )
  };
}

const keywordGroups: Record<SignalCategory, string[]> = {
  growth: [
    "增长", "上线", "发布", "合作", "融资", "扩张", "新增", "record growth",
    "launch", "partnership", "funding", "expansion", "revenue growth", "new market"
  ],
  risk: [
    "风险", "下降", "亏损", "投诉", "故障", "召回", "裁员", "诉讼", "监管",
    "churn", "decline", "outage", "recall", "layoff", "lawsuit", "complaint", "breach"
  ],
  competitive: [
    "竞品", "竞争", "收购", "定价", "市场份额", "替代", "并购",
    "competitor", "acquisition", "pricing", "market share", "alternative", "merger"
  ],
  operational: [
    "运营", "流程", "交付", "效率", "库存", "供应链", "招聘", "组织",
    "operations", "workflow", "delivery", "efficiency", "inventory", "supply chain", "hiring"
  ]
};

function classify(text: string) {
  const normalized = text.toLowerCase();
  const scores = Object.entries(keywordGroups).map(([category, keywords]) => ({
    category: category as SignalCategory,
    score: keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword) ? 1 : 0),
      0
    )
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0
    ? scores[0]
    : { category: "operational" as SignalCategory, score: 0 };
}

function priorityFromImpact(impact: number): DecisionPriority {
  if (impact >= 88) return "critical";
  if (impact >= 72) return "high";
  if (impact >= 52) return "medium";
  return "low";
}

function decisionFor(category: SignalCategory, sourceName: string) {
  const templates: Record<
    SignalCategory,
    { title: string; rationale: string; action: string }
  > = {
    growth: {
      title: "评估并捕捉增长机会",
      rationale: "来源出现增长、发布或合作类信号，可能形成新的销售或市场窗口。",
      action: "在 24 小时内核实信号，确认目标客户、负责人和可量化的下一步动作。"
    },
    risk: {
      title: "启动风险响应评估",
      rationale: "来源出现下降、故障、投诉或监管类信号，需要在影响扩大前确认暴露面。",
      action: "指派负责人核实影响范围，形成风险清单并提交管理者审批响应方案。"
    },
    competitive: {
      title: "更新竞争态势判断",
      rationale: "来源出现竞品、收购、定价或市场份额变化，可能影响当前定位与销售策略。",
      action: "对比现有产品与定价，更新竞品简报并确认是否需要调整销售话术。"
    },
    operational: {
      title: "检查运营变化及依赖",
      rationale: "来源出现流程、交付、组织或供应链变化，可能影响执行节奏。",
      action: "核对相关流程、负责人和依赖项，确认是否需要创建跟进任务。"
    }
  };
  const template = templates[category];
  return {
    title: template.title,
    rationale: sourceName + "：" + template.rationale,
    recommendedAction: template.action
  };
}

async function extractSource(source: SignalSource) {
  const target = await validateSourceUrl(source.url);
  await assertRobotsAllowed(target);
  const accept =
    source.kind === "json"
      ? "application/json,text/json;q=0.9"
      : source.kind === "rss"
        ? "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9"
        : "text/html,application/xhtml+xml;q=0.9";
  const { response, finalUrl } = await fetchWithRedirects(target, accept);
  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (
    !contentType.includes("html") &&
    !contentType.includes("xml") &&
    !contentType.includes("json") &&
    !contentType.includes("text/plain")
  ) {
    throw new SourceFetchError("仅支持 HTML、RSS/XML 或 JSON 文本来源");
  }

  const content = await readLimitedText(response);
  if (!content.trim()) throw new SourceFetchError("来源没有可分析的文本内容");

  const extracted =
    source.kind === "json" || contentType.includes("json")
      ? extractJson(content, finalUrl)
      : source.kind === "rss" || contentType.includes("xml")
        ? extractFeed(content, finalUrl)
        : extractHtml(content, finalUrl);

  if (!extracted.text || extracted.text.length < 30) {
    throw new SourceFetchError("来源正文过短，无法形成业务信号");
  }

  return {
    ...extracted,
    sourceUrl:
      "itemUrl" in extracted
        ? String(extracted.itemUrl)
        : finalUrl.toString(),
    contentHash: sha256(extracted.title + "\n" + extracted.text)
  };
}

function createSignalAndDecision(
  source: SignalSource,
  extracted: Awaited<ReturnType<typeof extractSource>>
) {
  const classification = classify(extracted.title + " " + extracted.text);
  const numericDensity = (
    extracted.text.match(/\d+(?:\.\d+)?(?:%|万|亿|million|billion|元|美元)?/gi) ?? []
  ).length;
  const impactScore = clamp(
    42 + classification.score * 9 + Math.min(numericDensity, 6) * 3,
    35,
    96
  );
  const confidence = clamp(
    58 + classification.score * 7 + Math.min(extracted.text.length / 800, 12),
    55,
    94
  );
  const capturedAt = new Date().toISOString();
  const fingerprint = sha256(source.id + ":" + extracted.contentHash);
  const summary = extracted.text.slice(0, 360).trim();
  const signal: BusinessSignal = {
    id: randomUUID(),
    sourceId: source.id,
    sourceName: source.name,
    fingerprint,
    contentHash: extracted.contentHash,
    title: extracted.title,
    summary: summary + (extracted.text.length > summary.length ? "…" : ""),
    category: classification.category,
    impactScore: Math.round(impactScore),
    confidence: Math.round(confidence),
    sourceUrl: extracted.sourceUrl,
    publishedAt: extracted.publishedAt,
    capturedAt,
    rawExcerpt: extracted.text.slice(0, 2_000)
  };
  const recommendation = decisionFor(signal.category, source.name);
  const decision: IntelligenceDecision = {
    id: randomUUID(),
    sourceId: source.id,
    signalId: signal.id,
    title: recommendation.title,
    rationale: recommendation.rationale,
    recommendedAction: recommendation.recommendedAction,
    priority: priorityFromImpact(signal.impactScore),
    confidence: signal.confidence,
    status: "proposed",
    createdAt: capturedAt,
    updatedAt: capturedAt,
    reviewedAt: null
  };

  return { signal, decision };
}

function updateSource(
  state: IntelligenceState,
  sourceId: string,
  update: Partial<SignalSource>
) {
  state.sources = state.sources.map((source) =>
    source.id === sourceId
      ? { ...source, ...update, updatedAt: new Date().toISOString() }
      : source
  );
}

export async function scanSourceAndUpdateState(
  subject: string,
  email: string,
  sourceId: string
) {
  let state = await loadIntelligenceState(subject, email);
  const source = state.sources.find((candidate) => candidate.id === sourceId);
  if (!source) throw new SourceFetchError("没有找到该信息来源");
  if (!source.active) throw new SourceFetchError("该信息来源已停用");

  const scanIsFresh =
    source.lastScanStatus === "scanning" &&
    Date.now() - new Date(source.updatedAt).getTime() < 5 * 60 * 1000;
  if (scanIsFresh) throw new SourceFetchError("该来源正在扫描，请稍后再试");

  updateSource(state, sourceId, {
    lastScanStatus: "scanning",
    lastError: null
  });
  state = await saveIntelligenceState(subject, state);

  try {
    const extracted = await extractSource(source);
    const unchanged = source.lastContentHash === extracted.contentHash;
    const scannedAt = new Date().toISOString();
    updateSource(state, sourceId, {
      lastScanStatus: "success",
      lastError: null,
      lastScannedAt: scannedAt,
      lastContentHash: extracted.contentHash
    });

    if (!unchanged) {
      const { signal, decision } = createSignalAndDecision(source, extracted);
      if (!state.signals.some((item) => item.fingerprint === signal.fingerprint)) {
        state.signals = [signal, ...state.signals];
        state.decisions = [decision, ...state.decisions];
      }
    }

    state = await saveIntelligenceState(subject, state);
    return { state, created: !unchanged };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知抓取错误";
    updateSource(state, sourceId, {
      lastScanStatus: error instanceof SourceBlockedError ? "blocked" : "error",
      lastError: message.slice(0, 500),
      lastScannedAt: new Date().toISOString()
    });
    await saveIntelligenceState(subject, state);
    throw error;
  }
}

function sourceIsDue(source: SignalSource) {
  if (!source.active || source.lastScanStatus === "scanning") return false;
  if (!source.lastScannedAt) return true;
  return (
    Date.now() - new Date(source.lastScannedAt).getTime() >=
    source.scanIntervalHours * 60 * 60 * 1000
  );
}

export async function runDueScans(limit = 8) {
  const subjects = await listIntelligenceAccounts();
  const results: Array<{ subject: string; sourceId: string; ok: boolean }> = [];

  for (const subject of subjects) {
    if (results.length >= limit) break;
    const state = await loadIntelligenceState(subject);
    if (!state.email) continue;
    const { data: user } = await findApplicationUser(state.email);
    if (!user || user.status !== "approved") continue;

    for (const source of state.sources.filter(sourceIsDue)) {
      if (results.length >= limit) break;
      try {
        await scanSourceAndUpdateState(subject, state.email, source.id);
        results.push({ subject, sourceId: source.id, ok: true });
      } catch {
        results.push({ subject, sourceId: source.id, ok: false });
      }
    }
  }

  return results;
}