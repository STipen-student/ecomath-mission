import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { classrooms, profiles } from "../../../db/schema";
import { hasTeacherSession } from "../../lib/teacher-auth";

export const dynamic = "force-dynamic";

function classCode() {
  return `EMA-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Silakan masuk dengan ChatGPT." }, { status: 401 });
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (!profile) return Response.json({ profile: null });
  if (profile.role === "teacher" && !await hasTeacherSession(user.email)) return Response.json({ error: "Sesi guru diperlukan." }, { status: 403 });
  const [classroom] = profile.classCode
    ? await db.select().from(classrooms).where(eq(classrooms.code, profile.classCode)).limit(1)
    : [];
  return Response.json({ profile: { ...profile, className: classroom?.name ?? null } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Silakan masuk dengan ChatGPT." }, { status: 401 });
  const body = await request.json() as { role?: string; fullName?: string; classCode?: string; className?: string };
  const role = body.role === "teacher" ? "teacher" : body.role === "student" ? "student" : null;
  const fullName = (body.fullName || user.fullName || user.displayName).trim().slice(0, 80);
  if (!role || fullName.length < 2) return Response.json({ error: "Nama dan peran wajib diisi." }, { status: 400 });
  if (role === "teacher" && !await hasTeacherSession(user.email)) return Response.json({ error: "Kredensial guru diperlukan." }, { status: 403 });
  const db = getDb();
  const [existing] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (existing && existing.role !== role) return Response.json({ error: "Peran akun sudah ditetapkan. Hubungi administrator sekolah untuk mengubahnya." }, { status: 409 });

  let code = existing?.classCode ?? "";
  let className = "";
  if (role === "student") {
    code = (body.classCode ?? "").trim().toUpperCase().slice(0, 20);
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.code, code)).limit(1);
    if (!classroom) return Response.json({ error: "Kode kelas tidak ditemukan." }, { status: 404 });
    className = classroom.name;
  } else {
    className = (body.className ?? "Kelas Matematika").trim().slice(0, 80);
    if (!code) {
      code = classCode();
      await db.insert(classrooms).values({ code, name: className, teacherEmail: user.email });
    } else {
      const [classroom] = await db.select().from(classrooms).where(and(eq(classrooms.code, code), eq(classrooms.teacherEmail, user.email))).limit(1);
      className = classroom?.name ?? className;
    }
  }

  if (existing) {
    await db.update(profiles).set({ fullName, classCode: code }).where(eq(profiles.email, user.email));
  } else {
    await db.insert(profiles).values({ email: user.email, fullName, role, classCode: code });
  }
  return Response.json({ profile: { email: user.email, fullName, role, classCode: code, className } }, { status: existing ? 200 : 201 });
}
