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
  chat: "/chatbot",
  chatAgents: "/api/chat/agents",
  chatRetrieval: "/api/chat/retrieval",
  chatRetrievalAgents: "/api/chat/retrieval_agents",
  chatStructuredOutput: "/api/chat/structured_output",
  retrievalIngest: "/api/retrieval/ingest",
  expertKnowledgeGenerateAnchor: "/api/expert_knowledge/generate_anchor",
  expertKnowledgeGenerateAnalysis:
    "/api/expert_knowledge/generate_analysis",
} as const;

export function buildBackendApiUrl(path: string) {
  return buildApiUrl(path, BACKEND_API_BASE_URL);
}
