import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { buildFeedback, missionStatus, safeJson } from "../../lib/assessment";
import type { EvidenceEntry, MissionReport } from "../../types/game";
import { getDb } from "../../../db";
import { attempts, classrooms, profiles } from "../../../db/schema";
import { hasTeacherSession } from "../../lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Silakan masuk dengan ChatGPT." }, { status: 401 });
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (!profile) return Response.json({ error: "Profil belum dibuat." }, { status: 404 });
  if (profile.role === "teacher" && !await hasTeacherSession(user.email)) return Response.json({ error: "Sesi guru diperlukan." }, { status: 403 });
  const rows = profile.role === "teacher"
    ? await db.select().from(attempts).where(eq(attempts.classCode, profile.classCode ?? "")).orderBy(desc(attempts.createdAt)).limit(120)
    : await db.select().from(attempts).where(eq(attempts.studentEmail, user.email)).orderBy(desc(attempts.createdAt)).limit(40);
  const [classroom] = profile.classCode ? await db.select().from(classrooms).where(eq(classrooms.code, profile.classCode)).limit(1) : [];
  return Response.json({ attempts: rows, classroom: classroom ?? null });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Silakan masuk dengan ChatGPT." }, { status: 401 });
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, user.email)).limit(1);
  if (!profile || profile.role !== "student" || !profile.classCode) return Response.json({ error: "Hanya profil siswa aktif yang dapat menyimpan misi." }, { status: 403 });
  const report = await request.json() as MissionReport;
  const scores = Array.isArray(report.scores) ? report.scores.map(Number) : [];
  if (scores.length !== 4 || scores.some((score) => !Number.isInteger(score) || score < 0 || score > 25)) return Response.json({ error: "Format skor tidak valid." }, { status: 400 });
  const total = scores.reduce((sum, score) => sum + score, 0);
  const evidence = Array.isArray(report.evidence) ? report.evidence.slice(0, 80) as EvidenceEntry[] : [];
  const feedback = buildFeedback(scores, evidence);
  const [saved] = await db.insert(attempts).values({
    studentEmail: user.email,
    studentName: profile.fullName,
    classCode: profile.classCode,
    caseId: String(report.caseId).slice(0, 100),
    caseTitle: String(report.caseTitle).slice(0, 160),
    cityName: String(report.cityName).slice(0, 100),
    difficulty: String(report.difficulty).slice(0, 30),
    understandScore: scores[0], planScore: scores[1], executeScore: scores[2], reflectScore: scores[3],
    totalScore: total, status: missionStatus(total), evidenceJson: safeJson(evidence), decisionJson: safeJson(report.decision), feedback,
  }).returning();
  return Response.json({ attempt: saved }, { status: 201 });
}
