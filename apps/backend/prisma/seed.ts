import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before seeding");
  }

  const hash = await bcrypt.hash(password, 12);

  await db.user.upsert({
    where: { email },
    update: { password: hash },
    create: { email, password: hash },
  });

  console.log(`Admin user created: ${email}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
