"use server";

import { db } from "@/db";
import { banks } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBank(formData: FormData) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const logo = formData.get("logo") as string;
  const website = formData.get("website") as string;

  if (!name) {
    throw new Error("Name is required");
  }

  await db.insert(banks).values({
    name,
    logo,
    website,
  });

  revalidatePath("/admin/banks");
}

export async function updateBank(id: number, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const logo = formData.get("logo") as string;
  const website = formData.get("website") as string;

  if (!name) throw new Error("Name is required");

  await db.update(banks)
    .set({ name, logo, website })
    .where(eq(banks.id, id));

  revalidatePath("/admin/banks");
  redirect("/admin/banks");
}

import { eq } from "drizzle-orm";

