import { ExpertKnowledgeForm } from "@/components/expert-knowledge/ExpertKnowledgeForm";

export default async function EditExpertKnowledgePage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;

  return <ExpertKnowledgeForm entryId={entryId} />;
}
