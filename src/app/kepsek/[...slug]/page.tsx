import { PortalPlaceholder } from "@/components/shared/portal-placeholder";

export default async function KepsekPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <PortalPlaceholder slug={slug} />;
}