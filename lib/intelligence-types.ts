export type SourceKind = "website" | "rss" | "json";
export type ScanStatus = "idle" | "scanning" | "success" | "error" | "blocked";
export type SignalCategory = "growth" | "risk" | "competitive" | "operational";
export type DecisionPriority = "low" | "medium" | "high" | "critical";
export type DecisionStatus = "proposed" | "approved" | "dismissed";

export type SignalSource = {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  active: boolean;
  scanIntervalHours: number;
  createdAt: string;
  updatedAt: string;
  lastScannedAt: string | null;
  lastScanStatus: ScanStatus;
  lastError: string | null;
  lastContentHash: string | null;
};

export type BusinessSignal = {
  id: string;
  sourceId: string;
  sourceName: string;
  fingerprint: string;
  contentHash: string;
  title: string;
  summary: string;
  category: SignalCategory;
  impactScore: number;
  confidence: number;
  sourceUrl: string;
  publishedAt: string | null;
  capturedAt: string;
  rawExcerpt: string;
  rawData?: unknown;
  isMock?: boolean;
};

export type IntelligenceDecision = {
  id: string;
  sourceId: string;
  signalId: string;
  title: string;
  rationale: string;
  recommendedAction: string;
  priority: DecisionPriority;
  confidence: number;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

export type IntelligenceState = {
  version: 1;
  email: string;
  sources: SignalSource[];
  signals: BusinessSignal[];
  decisions: IntelligenceDecision[];
  updatedAt: string;
};