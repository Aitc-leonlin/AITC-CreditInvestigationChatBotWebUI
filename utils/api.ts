function normalizePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(path: string, baseUrl?: string) {
  const normalizedPath = normalizePath(path);
  if (!baseUrl) return normalizedPath;

  return `${baseUrl.replace(/\/$/, "")}${normalizedPath}`;
}

// Centralized frontend-to-backend API config. Update these constants directly
// when the backend server host or routes change.
export const BACKEND_API_BASE_URL = "http://localhost:3001";

export const BACKEND_API_PATHS = {
  chat: "/api/chatbot",
  chatWithExternal: "/api/chatbot-with-external",
  chatAgents: "/api/chat/agents",
  chatRetrieval: "/api/chat/retrieval",
  chatRetrievalAgents: "/api/chat/retrieval-agents",
  chatStructuredOutput: "/api/chat/structured-output",
  reportGeneratorGenerate: "/api/report-generator/generate",
  reportGeneratorHistory: "/api/report-generator/history",
  retrievalIngest: "/api/retrieval/ingest",
  expertKnowledgeGenerateAnchor: "/api/expert-knowledge/generate-anchor",
  expertKnowledgeGenerateAnalysis:
    "/api/expert-knowledge/generate-analysis",
} as const;

export function buildBackendApiUrl(path: string) {
  return buildApiUrl(path, BACKEND_API_BASE_URL);
}
