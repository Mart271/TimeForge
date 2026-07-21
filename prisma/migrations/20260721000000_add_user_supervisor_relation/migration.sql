-- Adds the FK constraint backing the new Prisma `supervisor` self-relation on User.
-- The `supervisor_id` column already existed as a plain scalar (no relation, no
-- constraint); this only adds referential integrity, no new columns.
ALTER TABLE "users"
  ADD CONSTRAINT "users_supervisor_id_fkey"
  FOREIGN KEY ("supervisor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
