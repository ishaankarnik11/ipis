-- Phase 1: Create project_roles table
CREATE TABLE "project_roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_roles_pkey" PRIMARY KEY ("id")
);

-- Unique index on name
CREATE UNIQUE INDEX "project_roles_name_key" ON "project_roles"("name");

-- Add nullable role_id column to employee_projects
ALTER TABLE "employee_projects" ADD COLUMN "role_id" TEXT;

-- Data migration: insert unique roles from existing employee_projects
INSERT INTO "project_roles" ("id", "name")
SELECT gen_random_uuid(), sub."role"
FROM (SELECT DISTINCT "role" FROM "employee_projects") AS sub;

-- Backfill role_id from the newly created project_roles
UPDATE "employee_projects" ep
SET "role_id" = pr."id"
FROM "project_roles" pr
WHERE ep."role" = pr."name";

-- Phase 2: Drop old role column, make role_id NOT NULL
ALTER TABLE "employee_projects" DROP COLUMN "role";
ALTER TABLE "employee_projects" ALTER COLUMN "role_id" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "employee_projects"
ADD CONSTRAINT "employee_projects_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "project_roles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
