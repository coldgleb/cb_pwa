import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function main() {
  const email = "saygingleb101@gmail.com";
  const password = "Ubuntu24.04";
  const name = "Admin G智能";

  console.log(`Checking if user ${email} exists...`);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    console.log(`User exists with ID: ${existing.id}. Updating role to admin and resetting password...`);
    await db.update(users)
      .set({
        password: hashedPassword,
        role: "admin"
      })
      .where(eq(users.id, existing.id));
    console.log("User updated successfully!");
  } else {
    console.log(`User does not exist. Creating new admin user...`);
    const id = randomUUID();
    await db.insert(users).values({
      id,
      email,
      password: hashedPassword,
      name,
      role: "admin"
    });
    console.log(`Admin user created successfully with ID: ${id}`);
  }
}

main().catch(console.error);
