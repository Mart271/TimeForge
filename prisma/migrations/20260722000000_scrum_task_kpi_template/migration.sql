-- Adds a nullable FK from ScrumTask to KpiTemplate so "Plan New Task" can
-- reference a real, admin-configured KPI metric instead of only free text.
-- Existing rows' kpi/plannedTarget text columns are untouched.
ALTER TABLE "scrum_tasks"
  ADD COLUMN "kpi_template_id" UUID;

ALTER TABLE "scrum_tasks"
  ADD CONSTRAINT "scrum_tasks_kpi_template_id_fkey"
  FOREIGN KEY ("kpi_template_id") REFERENCES "kpi_templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
