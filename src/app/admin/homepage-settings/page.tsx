import { HomepageSettingsControls } from "@/components/admin/homepage-settings-controls";
import { HomepageSettingsService } from "@/lib/services/homepage-settings-service";

export default async function AdminHomepageSettingsPage() {
  const settings = await HomepageSettingsService.get();

  return (
    <div className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Homepage Settings</h1>
      <HomepageSettingsControls initialHeroProductCount={settings.heroProductCount} />
    </div>
  );
}
