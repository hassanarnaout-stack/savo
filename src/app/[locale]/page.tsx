import { V21Homepage } from "@/components/home/v21-homepage";
import { getHomepageViewModel } from "@/lib/homepage-view-model";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, data] = await Promise.all([params, getHomepageViewModel()]);
  return <V21Homepage data={data} locale={locale} />;
}
