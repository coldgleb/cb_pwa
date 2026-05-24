"use server";

import { db } from "@/db";
import { spendingCategories } from "@/db/schema";
import { auth } from "@/auth";
import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getSpendingCategories() {
  return db.select().from(spendingCategories);
}

export async function createSpendingCategory(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const parentIdRaw = formData.get("parentId") as string;
  const parentId = parentIdRaw ? parseInt(parentIdRaw) : null;

  if (!name) throw new Error("Name is required");

  await db.insert(spendingCategories).values({
    name,
    parentId,
  });

  revalidatePath("/admin/spending-categories");
}

export async function updateSpendingCategory(id: number, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const parentIdRaw = formData.get("parentId") as string;
  
  const updateData: any = {};
  if (name !== null) updateData.name = name;
  if (parentIdRaw !== null && parentIdRaw !== undefined) {
    updateData.parentId = parentIdRaw ? parseInt(parentIdRaw) : null;
  }

  if (Object.keys(updateData).length === 0) return;

  await db.update(spendingCategories)
    .set(updateData)
    .where(eq(spendingCategories.id, id));

  revalidatePath("/admin/spending-categories");
}

export async function moveSpendingCategory(id: number, newParentId: number | null, newIndex: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  await db.transaction(async (tx) => {
    // 1. Update the moved category's parent
    await tx.update(spendingCategories)
      .set({ parentId: newParentId })
      .where(eq(spendingCategories.id, id));

    // 2. Get all categories in the same new parent to reorder them
    const peers = await tx.select()
      .from(spendingCategories)
      .where(newParentId ? eq(spendingCategories.parentId, newParentId) : isNull(spendingCategories.parentId))
      .orderBy(spendingCategories.sortOrder);

    // 3. Reorder peers to accommodate the new index
    const otherPeers = peers.filter(p => p.id !== id);
    otherPeers.splice(newIndex, 0, peers.find(p => p.id === id)!);

    for (let i = 0; i < otherPeers.length; i++) {
      await tx.update(spendingCategories)
        .set({ sortOrder: i })
        .where(eq(spendingCategories.id, otherPeers[i].id));
    }
  });

  revalidatePath("/admin/spending-categories");
}

export async function deleteSpendingCategory(id: number) {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Unauthorized");

  // Check if it has children
  const children = await db.select().from(spendingCategories).where(eq(spendingCategories.parentId, id));
  if (children.length > 0) throw new Error("Cannot delete category with children");

  await db.delete(spendingCategories).where(eq(spendingCategories.id, id));

  revalidatePath("/admin/spending-categories");
}

export async function getSpendingCategoryOptions(excludeId?: number) {
  const all = await db.select().from(spendingCategories).orderBy(spendingCategories.sortOrder);
  
  const map = new Map();
  all.forEach(c => map.set(c.id, { ...c, children: [] }));
  
  const tree: any[] = [];
  all.forEach(c => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId).children.push(map.get(c.id));
    } else {
      tree.push(map.get(c.id));
    }
  });

  const options: { value: string; label: string; disabled: boolean }[] = [];
  
  function traverse(node: any, level: number) {
    const prefix = "  ".repeat(level) + (level > 0 ? "↳ " : "");
    options.push({ 
      value: node.id.toString(), 
      label: `${prefix}${node.name}`,
      disabled: node.id === excludeId
    });
    node.children.forEach((child: any) => traverse(child, level + 1));
  }

  tree.forEach(root => traverse(root, 0));
  return options;
}
