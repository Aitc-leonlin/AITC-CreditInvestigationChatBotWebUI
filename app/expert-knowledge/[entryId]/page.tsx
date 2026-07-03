"use client";

import { useParams } from "next/navigation";

import { ExpertKnowledgeForm } from "@/components/expert-knowledge/ExpertKnowledgeForm";

export default function ExpertKnowledgeDetailPage() {
  const params = useParams<{ entryId: string }>();

  return <ExpertKnowledgeForm entryId={params.entryId} readOnly />;
}
