"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tag, Trash2, GripVertical, ChevronRight } from "lucide-react";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";
import CategoryEditForm from "./CategoryEditForm";
import { deleteSpendingCategory, moveSpendingCategory } from "@/lib/actions/spending-categories";

interface CategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  children: CategoryNode[];
}

interface CategoryTreeProps {
  tree: CategoryNode[];
}

export default function CategoryTree({ tree: initialTree }: CategoryTreeProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const findNode = (nodes: CategoryNode[], id: number): { node: CategoryNode, parent: CategoryNode | null, index: number } | null => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === id) return { node: nodes[i], parent: null, index: i };
          const childResult = findNode(nodes[i].children, id);
          if (childResult) {
            if (childResult.parent === null) {
              return { ...childResult, parent: nodes[i] };
            }
            return childResult;
          }
        }
        return null;
      };

      const activeInfo = findNode(initialTree, active.id);
      
      // Special case: dropped on a "nest" target
      const overIdStr = over.id.toString();
      if (overIdStr.startsWith("nest-")) {
        const targetParentId = parseInt(overIdStr.replace("nest-", ""));
        if (activeInfo && activeInfo.node.id !== targetParentId) {
          await moveSpendingCategory(active.id as number, targetParentId, 0);
          return;
        }
      }

      const overInfo = findNode(initialTree, over.id);

      if (activeInfo && overInfo) {
        const newParentId = overInfo.parent?.id || null;
        const isDescendant = (parent: CategoryNode, targetId: number): boolean => {
          if (parent.id === targetId) return true;
          return parent.children.some(child => isDescendant(child, targetId));
        };
        const movingIntoSelf = overInfo.parent && isDescendant(activeInfo.node, overInfo.parent.id);
        if (!movingIntoSelf) {
          await moveSpendingCategory(active.id as number, newParentId, overInfo.index);
        } else {
          alert("Нельзя переместить категорию в саму себя или в свои подкатегории");
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`${stack({ gap: "8px" })} ${activeId ? "dragging" : ""}`}>
        <SortableContext items={initialTree.map(n => n.id)} strategy={verticalListSortingStrategy}>
          {initialTree.map((node) => (
            <SortableCategoryItem key={node.id} node={node} level={0} />
          ))}
        </SortableContext>
      </div>
      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: "0.5",
            },
          },
        }),
      }}>
        {activeId ? (
          <div className={css({ 
            p: "16px", 
            bg: "var(--card-bg)", 
            borderRadius: "14px", 
            border: "1px solid var(--sber-green)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            opacity: 0.9,
            cursor: "grabbing"
          })}>
            <span className={css({ fontWeight: "800", fontSize: "15px" })}>Перемещение...</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableCategoryItem({ node, level }: { node: CategoryNode; level: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const { setNodeRef: setNestRef, isOver: isOverNest } = useDroppable({
    id: `nest-${node.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isLeaf = node.children.length === 0;

  return (
    <div ref={setNodeRef} style={style} className={stack({ gap: "0", mb: level === 0 ? "16px" : "2px" })}>
      <div className={`group ${flex({ 
        align: "center", 
        justify: "space-between", 
        px: "16px", 
        py: "12px", 
        bg: isOverNest ? "rgba(33, 160, 56, 0.1)" : (level === 0 ? "var(--surface-secondary)" : (level === 1 ? "rgba(33, 160, 56, 0.03)" : "transparent")),
        borderRadius: "14px",
        border: level === 0 ? "1px solid var(--border-color)" : (isOverNest ? "1px dashed var(--sber-green)" : "none"),
        borderBottom: level > 0 && !isOverNest ? "1px solid var(--separator)" : undefined,
        shadow: level === 0 ? "sm" : "none",
        transition: "all 0.2s",
        _hover: level > 0 ? { bg: "var(--surface-secondary)" } : undefined,
        position: "relative"
      })}`}>
        
        <div 
          ref={setNestRef} 
          className={css({ 
            position: "absolute", 
            top: 0, 
            left: "40px", 
            right: "100px", 
            bottom: 0, 
            zIndex: 1,
            display: "none",
            ".dragging &": { display: "block" }
          })} 
        />

        <div className={flex({ align: "center", gap: "12px", position: "relative", zIndex: 0 })}>
          <div {...attributes} {...listeners} className={css({ cursor: "grab", color: "var(--secondary-text)", _active: { cursor: "grabbing" } })}>
            <GripVertical size={18} />
          </div>
          
          {level === 0 ? (
            <div className={css({ p: "6px", bg: "var(--foreground)", color: "var(--card-bg)", borderRadius: "8px" })}>
              <Tag size={14} />
            </div>
          ) : (
            <div className={css({ 
              w: "8px", 
              h: "8px", 
              bg: isLeaf ? "sberGreen" : "var(--secondary-text)", 
              borderRadius: "full",
              flexShrink: 0,
              opacity: 0.8
            })} />
          )}
          <div className={stack({ gap: "0" })}>
            <div className={flex({ align: "center", gap: "6px" })}>
              <CategoryEditForm id={node.id} initialName={node.name} level={level} />
              {isOverNest && (
                <div className={flex({ align: "center", gap: "4px", color: "sberGreen", fontSize: "11px", fontWeight: "700" })}>
                  <ChevronRight size={12} /> переместить внутрь
                </div>
              )}
            </div>
            {level === 0 && !isLeaf && (
              <span className={css({ fontSize: "10px", color: "var(--secondary-text)", fontWeight: "700", mt: "2px" })}>
                {node.children.length} ПОДКАТЕГОРИЙ
              </span>
            )}
          </div>
        </div>
        <div className={flex({ gap: "4px", position: "relative", zIndex: 2 })}>
          <form action={async () => {
            if (confirm("Удалить категорию?")) {
              await deleteSpendingCategory(node.id);
            }
          }}>
            <button 
              type="submit" 
              className={css({ 
                p: "8px", 
                color: "var(--secondary-text)", 
                borderRadius: "10px",
                _hover: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }, 
                cursor: "pointer" 
              })}
            >
              <Trash2 size={16} />
            </button>
          </form>
        </div>
      </div>

      {node.children.length > 0 ? (
        <div className={css({ 
          borderLeft: "2px solid var(--border-color)",
          ml: level === 0 ? "29px" : "20px",
          pl: "20px",
          mt: "4px",
          mb: "8px"
        })}>
          <SortableContext items={node.children.map(n => n.id)} strategy={verticalListSortingStrategy}>
            {node.children.map(child => (
              <SortableCategoryItem key={child.id} node={child} level={level + 1} />
            ))}
          </SortableContext>
        </div>
      ) : (
        <div 
          className={css({ 
            ml: level === 0 ? "49px" : "40px",
            h: "8px",
            bg: "transparent",
            _hover: { bg: "rgba(33, 160, 56, 0.05)", h: "20px" },
            borderRadius: "8px",
            transition: "all 0.2s",
            mt: "-8px",
            mb: "8px",
            border: "1px dashed transparent"
          })}
        />
      )}
    </div>
  );
}
