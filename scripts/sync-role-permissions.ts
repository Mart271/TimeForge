/**
 * Syncs every tenant's Role -> Permission grants from packages/shared's
 * ROLE_PERMISSIONS (the single source of truth for what each role can do) into
 * the database's RolePermission table.
 *
 * prisma/seed.ts does this too, but only for its own hardcoded demo tenant —
 * fine for local dev, useless for production. This script is tenant-agnostic:
 * it finds every tenant and every system role already in the DB and re-syncs
 * their permission grants, without touching any tenant/org/user data. Safe to
 * re-run any time permissions.ts changes and a real (non-demo) tenant's DB has
 * drifted from it — e.g. a role gains a permission in code but existing
 * deployments keep 403ing until this runs.
 *
 * Run with the privileged DIRECT_URL connection, same as prisma/seed.ts.
 */
import { PrismaClient } from '@prisma/client';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, Role } from '@timeforge/shared';

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

async function main() {
  // Permission catalog must exist before any RolePermission can reference it.
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  const permByKey = new Map((await prisma.permission.findMany()).map((p) => [p.key, p.id]));

  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  let rolesSynced = 0;

  for (const tenant of tenants) {
    for (const roleKey of Object.values(Role)) {
      const role = await prisma.role.findFirst({
        where: { tenantId: tenant.id, key: roleKey, deletedAt: null },
      });
      // Only sync roles that already exist for this tenant — this script never
      // creates a role, just corrects what an existing one can do.
      if (!role) continue;

      const mapped = ROLE_PERMISSIONS[roleKey];
      const grantKeys = mapped.includes('*') ? ALL_PERMISSIONS : mapped;

      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({
        data: grantKeys.map((k) => ({ roleId: role.id, permissionId: permByKey.get(k)! })),
        skipDuplicates: true,
      });
      rolesSynced++;
      console.log(`  synced ${tenant.slug}/${roleKey}: ${grantKeys.length} permissions`);
    }
  }

  console.log(`\n✓ Synced ${rolesSynced} role(s) across ${tenants.length} tenant(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
