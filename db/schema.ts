import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["student", "teacher"] }).notNull(),
  classCode: text("class_code"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("profiles_email_unique").on(table.email)]);

export const classrooms = sqliteTable("classrooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  teacherEmail: text("teacher_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("classrooms_code_unique").on(table.code),
  index("classrooms_teacher_idx").on(table.teacherEmail),
]);

export const attempts = sqliteTable("attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentEmail: text("student_email").notNull(),
  studentName: text("student_name").notNull(),
  classCode: text("class_code").notNull(),
  caseId: text("case_id").notNull(),
  caseTitle: text("case_title").notNull(),
  cityName: text("city_name").notNull(),
  difficulty: text("difficulty").notNull(),
  understandScore: integer("understand_score").notNull(),
  planScore: integer("plan_score").notNull(),
  executeScore: integer("execute_score").notNull(),
  reflectScore: integer("reflect_score").notNull(),
  totalScore: integer("total_score").notNull(),
  status: text("status").notNull(),
  evidenceJson: text("evidence_json").notNull(),
  decisionJson: text("decision_json").notNull(),
  feedback: text("feedback").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("attempts_class_idx").on(table.classCode),
  index("attempts_student_idx").on(table.studentEmail),
]);
