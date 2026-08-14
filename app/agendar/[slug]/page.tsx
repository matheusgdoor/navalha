import { redirect } from "next/navigation";
export default async function TenantBooking({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/agendar?organization=${encodeURIComponent(slug)}`);
}
