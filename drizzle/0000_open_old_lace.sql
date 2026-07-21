CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_email` text NOT NULL,
	`student_name` text NOT NULL,
	`class_code` text NOT NULL,
	`case_id` text NOT NULL,
	`case_title` text NOT NULL,
	`city_name` text NOT NULL,
	`difficulty` text NOT NULL,
	`understand_score` integer NOT NULL,
	`plan_score` integer NOT NULL,
	`execute_score` integer NOT NULL,
	`reflect_score` integer NOT NULL,
	`total_score` integer NOT NULL,
	`status` text NOT NULL,
	`evidence_json` text NOT NULL,
	`decision_json` text NOT NULL,
	`feedback` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attempts_class_idx` ON `attempts` (`class_code`);--> statement-breakpoint
CREATE INDEX `attempts_student_idx` ON `attempts` (`student_email`);--> statement-breakpoint
CREATE TABLE `classrooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`teacher_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classrooms_code_unique` ON `classrooms` (`code`);--> statement-breakpoint
CREATE INDEX `classrooms_teacher_idx` ON `classrooms` (`teacher_email`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text NOT NULL,
	`class_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);