import { db } from "@/db";
import { spendingCategories } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getSpendingCategoryOptions } from "@/lib/actions/spending-categories";
import CategoryTree from "@/components/admin/CategoryTree";
import AddSpendingCategoryModal from "@/components/admin/AddSpendingCategoryModal";

export const dynamic = "force-dynamic";

interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  children: CategoryNode[];
}

function buildTree(items: any[]): CategoryNode[] {
  const map = new Map();
  const tree: CategoryNode[] = [];

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach(item => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(map.get(item.id));
    } else {
      tree.push(map.get(item.id));
    }
  });

  return tree;
}

export default async function SpendingCategoriesAdminPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const allCategories = await db.select().from(spendingCategories).orderBy(spendingCategories.sortOrder);
  const tree = buildTree(allCategories);

  const parentOptions = [
    { value: "", label: "--- ВЕРХНИЙ УРОВЕНЬ ---" },
    ...(await getSpendingCategoryOptions())
  ];

  return (
    <div className={stack({ gap: "32px" })}>
      <header className={flex({ justify: "space-between", align: "center", gap: "16px" })}>
        <div className={flex({ align: "center", gap: "16px" })}>
            <a href="/profile" className="sber-icon-button" style={{ flexShrink: 0 }}>
            <ArrowLeft size={20} />
            </a>
            <div className={stack({ gap: "4px" })}>
            <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Категории трат</h1>
            <p className={css({ fontSize: "14px", color: "var(--secondary-text)" })}>Иерархия категорий расходов</p>
            </div>
        </div>
        <AddSpendingCategoryModal parentOptions={parentOptions} />
      </header>

      {/* Список категорий */}
      <section className="sber-card">
        <h2 className="sber-label" style={{ marginBottom: "20px" }}>СТРУКТУРА КАТЕГОРИЙ</h2>
        <CategoryTree tree={tree} />
      </section>
    </div>
  );
}
