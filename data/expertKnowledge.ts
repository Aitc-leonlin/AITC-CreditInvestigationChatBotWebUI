import { COMPANY_OPTIONS, getCompanyByLabel } from "@/data/companyKnowledge";

export const EXPERT_KNOWLEDGE_STORAGE_KEY = "aitc-expert-knowledge-prompts-v1";
export const EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE = "All";
export const EXPERT_KNOWLEDGE_DATA_SOURCE_OPTIONS = ["財務報表"] as const;
export const DEFAULT_EXPERT_KNOWLEDGE_DATA_SOURCE =
  EXPERT_KNOWLEDGE_DATA_SOURCE_OPTIONS[0];

export type ExpertKnowledgeEntry = {
  id: string;
  title: string;
  dataSource: string;
  industry: string;
  companyLabel: string;
  companyPromptValue: string;
  sourceSchemaKey: string;
  anchorDescription: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
};

function buildSchemaSegment(value: string) {
  return value.trim().replace(/\s+/g, "_");
}

export function buildExpertKnowledgeSourceSchemaKey(
  dataSource: string,
  industry: string,
  companyLabel: string,
) {
  return `expert_knowledge.${buildSchemaSegment(dataSource)}.${buildSchemaSegment(industry)}.${buildSchemaSegment(companyLabel)}`;
}

export function normalizeExpertKnowledgeEntry(entry: ExpertKnowledgeEntry) {
  const normalizedDataSource =
    entry.dataSource ?? DEFAULT_EXPERT_KNOWLEDGE_DATA_SOURCE;
  const matchedCompany =
    COMPANY_OPTIONS.find((option) => option.label === entry.companyLabel) ??
    COMPANY_OPTIONS.find((option) => option.promptValue === entry.companyLabel) ??
    COMPANY_OPTIONS.find(
      (option) => option.promptValue === entry.companyPromptValue,
    ) ??
    null;
  const normalizedCompanyLabel =
    entry.companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE ||
    !entry.companyLabel
      ? EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE
      : matchedCompany?.label ?? entry.companyLabel;
  const normalizedCompanyPromptValue =
    normalizedCompanyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE
      ? ""
      : matchedCompany?.promptValue ?? entry.companyPromptValue ?? "";

  return {
    ...entry,
    title: entry.title ?? "",
    dataSource: normalizedDataSource,
    companyLabel: normalizedCompanyLabel,
    companyPromptValue: normalizedCompanyPromptValue,
    sourceSchemaKey:
      entry.sourceSchemaKey ||
      buildExpertKnowledgeSourceSchemaKey(
        normalizedDataSource,
        entry.industry,
        normalizedCompanyLabel,
      ),
    anchorDescription:
      entry.anchorDescription ?? (entry as { description?: string }).description ?? "",
    createdAt: entry.createdAt ?? entry.updatedAt ?? new Date().toISOString(),
  };
}

export function sortExpertKnowledgeEntries(entries: ExpertKnowledgeEntry[]) {
  return [...entries].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function readExpertKnowledgeEntries() {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(EXPERT_KNOWLEDGE_STORAGE_KEY);
    if (!rawValue) return [];
    const parsedValue = JSON.parse(rawValue) as ExpertKnowledgeEntry[];
    return sortExpertKnowledgeEntries(
      parsedValue.map(normalizeExpertKnowledgeEntry),
    );
  } catch {
    return [];
  }
}

export function writeExpertKnowledgeEntries(entries: ExpertKnowledgeEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    EXPERT_KNOWLEDGE_STORAGE_KEY,
    JSON.stringify(
      sortExpertKnowledgeEntries(entries.map(normalizeExpertKnowledgeEntry)),
    ),
  );
}

export function buildExpertKnowledgeMap(entries: ExpertKnowledgeEntry[]) {
  return new Map(entries.map((entry) => [entry.companyLabel, entry]));
}

export function resolveAppliedExpertKnowledgeEntries() {
  return readExpertKnowledgeEntries();
}

export function resolveExpertKnowledgeEntry(companyLabel: string) {
  if (!companyLabel) return null;

  const entries = readExpertKnowledgeEntries();
  const directMatch = entries.find(
    (entry) => entry.companyLabel === companyLabel,
  );
  if (directMatch) return directMatch;

  const company = getCompanyByLabel(companyLabel);
  if (!company) return null;

  return (
    entries.find(
      (entry) =>
        entry.companyPromptValue === company.promptValue ||
        (entry.industry === company.industry &&
          (entry.companyLabel === EXPERT_KNOWLEDGE_ALL_COMPANY_VALUE ||
            !entry.companyLabel)),
    ) ?? null
  );
}
