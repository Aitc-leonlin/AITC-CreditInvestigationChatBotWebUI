import { redirect } from "next/navigation";

export default async function ExpertKnowledgeEntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;

  redirect(`/expert_knowledge/${entryId}/edit`);
}
