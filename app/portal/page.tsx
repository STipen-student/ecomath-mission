import { chatGPTSignOutPath, identityProviderLabel, requireChatGPTUser } from "../chatgpt-auth";
import { PortalClient } from "../components/PortalClient";
import { hasTeacherSession } from "../lib/teacher-auth";

export const dynamic = "force-dynamic";

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ role?: string; demo?: string }> }) {
  const params = await searchParams;
  const demoRole = process.env.NODE_ENV === "development" && (params.demo === "teacher" || params.demo === "student") ? params.demo : null;
  const user = demoRole
    ? { email: `${demoRole}@demo.local`, displayName: demoRole === "teacher" ? "Ibu Rina Pratama" : "Nadia Putri", fullName: demoRole === "teacher" ? "Ibu Rina Pratama" : "Nadia Putri" }
    : await requireChatGPTUser(`/portal?role=${params.role === "teacher" ? "teacher" : "student"}`);
  const roleHint = params.role === "teacher" ? "teacher" : "student";
  const teacherAuthorized = demoRole === "teacher" || (roleHint === "teacher" && await hasTeacherSession(user.email));
  return <PortalClient identity={user} roleHint={roleHint} demoMode={Boolean(demoRole)} teacherAuthorized={teacherAuthorized} logoutHref={chatGPTSignOutPath("/")} identityProvider={identityProviderLabel()} />;
}
