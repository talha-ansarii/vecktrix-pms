import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { getClientPortalData } from "@/lib/actions/clients";
import { ProfileForm } from "./ProfileForm";

export default async function PortalProfilePage() {
  const client = await getClientPortalData().catch(() => null);

  return (
    <AppShell isClient currentPath="/portal/profile">
      <PageHeader
        overline="Client Portal"
        title="Your Profile"
        description="Update your contact details"
      />

      {client ? (
        <div className="max-w-lg">
          <ProfileForm
            defaultValues={{
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone ?? "",
              company: client.company ?? "",
            }}
          />
        </div>
      ) : (
        <p className="text-text-darkSecondary">No profile linked to your account.</p>
      )}
    </AppShell>
  );
}
