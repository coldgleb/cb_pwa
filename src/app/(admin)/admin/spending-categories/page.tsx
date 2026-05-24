import { db } from "@/db";
import { spendingCategories } from "@/db/schema";
import { auth } from "@/auth";
import { css } from "../../../../../styled-system/css";
import { stack, flex } from "../../../../../styled-system/patterns";
import { ArrowLeft, Plus, Trash2, Edit2, ChevronRight, ChevronDown, Tag } from "lucide-react";
import { redirect } from "next/navigation";
import { createSpendingCategory, deleteSpendingCategory, updateSpendingCategory, getSpendingCategoryOptions } from "@/lib/actions/spending-categories";
import SearchableSelect from "@/components/SearchableSelect";
import CategoryTree from "@/components/admin/CategoryTree";

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
      <header className={flex({ align: "center", gap: "16px" })}>
        <a href="/admin/recalculate" className="sber-icon-button" style={{ flexShrink: 0 }}>
          <ArrowLeft size={20} />
        </a>
        <div className={stack({ gap: "4px" })}>
          <h1 className={css({ fontSize: "24px", fontWeight: "800", color: "var(--foreground)" })}>Глобальные категории</h1>
          <p className={css({ fontSize: "14px", color: "var(--secondary-text)" })}>Настройка иерархии категорий для всех пользователей</p>
        </div>
      </header>

      <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", lg: "1fr 400px" }, gap: "40px", alignItems: "start" })}>
        
        {/* Список категорий */}
        <section className="sber-card">
          <h2 className="sber-label" style={{ marginBottom: "20px" }}>СТРУКТУРА КАТЕГОРИЙ</h2>
          <CategoryTree tree={tree} />
        </section>

        {/* Форма создания */}
        <section className="sber-card">
          <h2 className="sber-label" style={{ marginBottom: "20px" }}>НОВАЯ КАТЕГОРИЯ</h2>
          <form action={createSpendingCategory} className={stack({ gap: "20px" })}>
            <div className={stack({ gap: "8px" })}>
              <label className="sber-label">НАЗВАНИЕ</label>
              <input name="name" type="text" required placeholder="Напр: Продукты" className="sber-input" />
            </div>
            <div className={stack({ gap: "8px" })}>
              <label className="sber-label">РОДИТЕЛЬСКАЯ КАТЕГОРИЯ</label>
              <SearchableSelect 
                name="parentId"
                options={parentOptions}
                placeholder="Верхний уровень"
              />
            </div>
            <button type="submit" className="sber-button">
              <Plus size={18} /> Добавить категорию
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
