import { COMPANY_OPTIONS } from "@/data/companyKnowledge";

export const WAREHOUSE_DATA_STORAGE_KEY = "aitc-external-knowledge-entries-v1";
export const LEGACY_NEGATIVE_NEWS_STORAGE_KEY = "aitc-negative-news-entries-v1";
export const WAREHOUSE_DATA_LIST_STORAGE_KEY = "list";
export const WAREHOUSE_DATA_CATEGORIES = [
  "負面消息",
  "新聞",
  "年報",
] as const;
export const DEFAULT_WAREHOUSE_DATA_CATEGORY =
  WAREHOUSE_DATA_CATEGORIES[0];

export type WarehouseDataCategory =
  (typeof WAREHOUSE_DATA_CATEGORIES)[number];

export type WarehouseDataEntry = {
  id: string;
  category: WarehouseDataCategory;
  title: string;
  industry: string;
  companyLabel: string;
  companyPromptValue: string;
  summary: string;
  source: string;
  url: string;
  recordUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};

type LegacyNegativeNewsEntry = Omit<WarehouseDataEntry, "category"> & {
  publishedAt?: string;
  sentiment?: string;
};

type StoredWarehouseDataEntry = Partial<
  WarehouseDataEntry & LegacyNegativeNewsEntry
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStoredWarehouseDataList(value: unknown) {
  if (Array.isArray(value)) {
    return value as StoredWarehouseDataEntry[];
  }

  if (!isRecord(value)) return [];

  if (Array.isArray(value.list)) {
    return value.list as StoredWarehouseDataEntry[];
  }

  if (Array.isArray(value.entries)) {
    return value.entries as StoredWarehouseDataEntry[];
  }

  return [];
}

function readStoredWarehouseDataList() {
  const storageKeys = [
    WAREHOUSE_DATA_STORAGE_KEY,
    LEGACY_NEGATIVE_NEWS_STORAGE_KEY,
    WAREHOUSE_DATA_LIST_STORAGE_KEY,
  ];

  for (const storageKey of storageKeys) {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) continue;

    const entries = getStoredWarehouseDataList(JSON.parse(rawValue));
    if (entries.length > 0) return entries;
  }

  return [];
}

function createWarehouseDataId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeWarehouseDataEntry(
  entry: StoredWarehouseDataEntry,
): WarehouseDataEntry {
  const matchedCompany =
    COMPANY_OPTIONS.find((option) => option.label === entry.companyLabel) ??
    COMPANY_OPTIONS.find((option) => option.promptValue === entry.companyLabel) ??
    COMPANY_OPTIONS.find(
      (option) => option.promptValue === entry.companyPromptValue,
    ) ??
    null;

  return {
    id: entry.id ?? createWarehouseDataId(),
    category:
      "category" in entry && entry.category
        ? entry.category
        : DEFAULT_WAREHOUSE_DATA_CATEGORY,
    title: entry.title ?? "",
    industry: entry.industry ?? matchedCompany?.industry ?? "",
    companyLabel: matchedCompany?.label ?? entry.companyLabel ?? "",
    companyPromptValue:
      matchedCompany?.promptValue ?? entry.companyPromptValue ?? "",
    summary: entry.summary ?? "",
    source: entry.source ?? "",
    url: entry.url ?? "",
    recordUpdatedAt: entry.recordUpdatedAt ?? "",
    createdAt: entry.createdAt ?? entry.updatedAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
}

export function sortWarehouseDataEntries(entries: WarehouseDataEntry[]) {
  return [...entries].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function readWarehouseDataEntries() {
  if (typeof window === "undefined") return [];

  try {
    return sortWarehouseDataEntries(
      readStoredWarehouseDataList().map(normalizeWarehouseDataEntry),
    );
  } catch {
    return [];
  }
}

export function resolveAppliedWarehouseDataEntries() {
  return readWarehouseDataEntries();
}

export function writeWarehouseDataEntries(entries: WarehouseDataEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WAREHOUSE_DATA_STORAGE_KEY,
    JSON.stringify(
      sortWarehouseDataEntries(entries.map(normalizeWarehouseDataEntry)),
    ),
  );
}
