import { AuthUI } from "@/components/ui/auth-ui";
import { LoginForm } from "@/components/login-form";
import { getPublicMapData } from "@/lib/repositories/public-map";

async function getLoginSystemStatus() {
  try {
    const data = await getPublicMapData();
    return {
      activeEventsCount: data.disasterEvents.length,
      available: true,
    };
  } catch {
    return {
      activeEventsCount: null,
      available: false,
    };
  }
}

export default async function LoginPage() {
  const systemStatus = await getLoginSystemStatus();

  return (
    <AuthUI
      image={{
        src: "/brand/login-emergency-command.png",
        alt: "Tim tanggap darurat mengoordinasikan penanganan banjir di posko lapangan",
      }}
    >
      <LoginForm systemStatus={systemStatus} />
    </AuthUI>
  );
}
