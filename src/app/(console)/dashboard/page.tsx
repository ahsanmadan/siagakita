import { DashboardRolePanels } from "@/components/dashboard-role-panels";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { requireProfile, roleLabel, type AppRole } from "@/lib/auth";
import { roleMission } from "@/lib/role-ui";
import { getAuditLogs } from "@/lib/repositories/audit";
import { getOperationsData } from "@/lib/repositories/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAdminUserSummary(role: AppRole) {
  if (role !== "admin") return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("profiles").select("app_role");
    if (error) return null;

    const roles = ((data ?? []) as { app_role: AppRole }[]).reduce<Record<AppRole, number>>((result, row) => {
      result[row.app_role] = (result[row.app_role] ?? 0) + 1;
      return result;
    }, {
      admin: 0,
      bpbd_operator: 0,
      field_officer: 0,
      shelter_manager: 0,
      warehouse_manager: 0,
      public_viewer: 0,
    });

    return {
      total: data?.length ?? 0,
      roles: Object.entries(roles)
        .filter(([, count]) => count > 0)
        .map(([roleName, count]) => ({ role: roleName as AppRole, count })),
    };
  } catch {
    return null;
  }
}

async function getAdminAuditPreview(role: AppRole) {
  if (role !== "admin") return [];

  try {
    return await getAuditLogs();
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [data, auditLogs, userSummary] = await Promise.all([
    getOperationsData(),
    getAdminAuditPreview(profile.role),
    getAdminUserSummary(profile.role),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Kendali"
        description={roleMission(profile.role)}
        actions={
          <Badge variant="secondary" className="min-h-11 rounded-full px-4 text-sm font-semibold">
            Login sebagai {roleLabel(profile.role)}
          </Badge>
        }
      />
      <DashboardRolePanels profile={profile} data={data} auditLogs={auditLogs} userSummary={userSummary} />
    </div>
  );
}
