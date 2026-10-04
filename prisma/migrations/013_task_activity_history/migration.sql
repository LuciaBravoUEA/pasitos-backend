CREATE TABLE "task_activity_events" (
  "id" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "routineId" UUID NOT NULL,
  "taskTitle" TEXT NOT NULL,
  "routineTitle" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL,
  "activityDate" DATE NOT NULL,
  "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_activity_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_activity_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "task_activity_events_studentId_activityDate_recordedAt_idx"
  ON "task_activity_events"("studentId", "activityDate", "recordedAt");
CREATE INDEX "task_activity_events_studentId_recordedAt_idx"
  ON "task_activity_events"("studentId", "recordedAt");
