import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { hasTeacherSession } from "../../lib/teacher-auth";
import { getDb } from "../../../db";
import { classrooms, profiles } from "../../../db/schema";

export const dynamic = "force-dynamic";

async function teacherContext() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Silakan masuk dengan ChatGPT." }, { status: 401 }) };
  if (!await hasTeacherSession(user.email)) return { error: Response.json({ error: "Sesi guru diperlukan." }, { status: 403 }) };
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(and(eq(profiles.email, user.email), eq(profiles.role, "teacher"))).limit(1);
  if (!profile) return { error: Response.json({ error: "Profil guru belum dibuat." }, { status: 404 }) };
  return { user, profile, db };
}

function generateCode() {
  return `EMA-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export async function GET() {
  const context = await teacherContext();
  if ("error" in context) return context.error;
  const rows = await context.db.select().from(classrooms).where(eq(classrooms.teacherEmail, context.user.email)).orderBy(desc(classrooms.createdAt));
  return Response.json({ classrooms: rows, activeCode: context.profile.classCode });
}

export async function POST(request: Request) {
  const context = await teacherContext();
  if ("error" in context) return context.error;
  const body = await request.json() as { name?: string };
  const name = String(body.name ?? "").trim().slice(0, 80);
  if (name.length < 3) return Response.json({ error: "Nama kelas minimal 3 karakter." }, { status: 400 });
  let code = "";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateCode();
    const [existing] = await context.db.select({ code: classrooms.code }).from(classrooms).where(eq(classrooms.code, candidate)).limit(1);
    if (!existing) { code = candidate; break; }
  }
  if (!code) return Response.json({ error: "Kode kelas belum dapat dibuat. Coba lagi." }, { status: 503 });
  const [classroom] = await context.db.insert(classrooms).values({ code, name, teacherEmail: context.user.email }).returning();
  await context.db.update(profiles).set({ classCode: code }).where(eq(profiles.email, context.user.email));
  return Response.json({ classroom, activeCode: code }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await teacherContext();
  if ("error" in context) return context.error;
  const body = await request.json() as { code?: string };
  const code = String(body.code ?? "").trim().toUpperCase().slice(0, 20);
  const [classroom] = await context.db.select().from(classrooms).where(and(eq(classrooms.code, code), eq(classrooms.teacherEmail, context.user.email))).limit(1);
  if (!classroom) return Response.json({ error: "Kelas tidak ditemukan atau bukan milik akun guru ini." }, { status: 404 });
  await context.db.update(profiles).set({ classCode: code }).where(eq(profiles.email, context.user.email));
  return Response.json({ classroom, activeCode: code });
}
