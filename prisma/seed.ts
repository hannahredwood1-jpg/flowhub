// Seeds the prop firm catalog. Safe to re-run: upserts by stable template id,
// and never overwrites a template a coach has edited in the portal (updatedById set).
import { PrismaClient } from "@prisma/client";
import rows from "./data/prop_firm_accounts.json";
import { rowToTemplate, slugify, type CatalogRow } from "../src/lib/catalog";

const prisma = new PrismaClient();

async function main() {
  const data = rows as CatalogRow[];
  const firmIds = new Map<string, string>();

  for (const name of [...new Set(data.map((r) => r.firm))]) {
    const firm = await prisma.propFirm.upsert({
      where: { name },
      update: {},
      create: { name, slug: slugify(name) },
    });
    firmIds.set(name, firm.id);
  }

  let created = 0, updated = 0, skipped = 0;
  for (const row of data) {
    const t = { ...rowToTemplate(row), firmId: firmIds.get(row.firm)! };
    const existing = await prisma.accountTemplate.findUnique({ where: { id: t.id } });
    if (!existing) {
      await prisma.accountTemplate.create({ data: t });
      created++;
    } else if (existing.updatedById) {
      skipped++; // hand-edited in the portal — keep the coach's version
    } else {
      await prisma.accountTemplate.update({ where: { id: t.id }, data: t });
      updated++;
    }
  }
  console.log(`Catalog seeded: ${created} created, ${updated} updated, ${skipped} kept (coach-edited).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
