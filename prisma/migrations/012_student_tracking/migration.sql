CREATE TABLE IF NOT EXISTS "tasks" (
  "id" UUID NOT NULL,
  "routineId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tasks_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "student_guardians" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "guardianId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "student_teachers" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "teacherId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_teachers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_teachers_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "student_teachers_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "task_completions" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT TRUE,
  "completedAt" TIMESTAMPTZ(6),
  "activityDate" DATE NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_completions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "task_completions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "tasks_routineId_position_idx" ON "tasks"("routineId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "student_guardians_studentId_guardianId_key" ON "student_guardians"("studentId", "guardianId");
CREATE INDEX IF NOT EXISTS "student_guardians_guardianId_studentId_idx" ON "student_guardians"("guardianId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "student_teachers_studentId_teacherId_key" ON "student_teachers"("studentId", "teacherId");
CREATE INDEX IF NOT EXISTS "student_teachers_teacherId_studentId_idx" ON "student_teachers"("teacherId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "task_completions_studentId_taskId_activityDate_key" ON "task_completions"("studentId", "taskId", "activityDate");
CREATE INDEX IF NOT EXISTS "task_completions_studentId_activityDate_idx" ON "task_completions"("studentId", "activityDate");
CREATE INDEX IF NOT EXISTS "task_completions_taskId_activityDate_idx" ON "task_completions"("taskId", "activityDate");