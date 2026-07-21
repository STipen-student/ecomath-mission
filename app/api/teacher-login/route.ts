import { getChatGPTUser } from "../../chatgpt-auth";
import { clearTeacherSession, createTeacherSession, hasTeacherSession, verifyTeacherCredentials } from "../../lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: await hasTeacherSession(user.email) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Masuk dengan ChatGPT terlebih dahulu." }, { status: 401 });
  const body = await request.json() as { username?: string; password?: string };
  const username = String(body.username ?? "").slice(0, 80);
  const password = String(body.password ?? "").slice(0, 200);
  if (!await verifyTeacherCredentials(username, password)) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return Response.json({ error: "Username atau sandi guru tidak sesuai." }, { status: 401 });
  }
  await createTeacherSession(user.email);
  return Response.json({ authenticated: true });
}

export async function DELETE() {
  await clearTeacherSession();
  return Response.json({ authenticated: false });
}
