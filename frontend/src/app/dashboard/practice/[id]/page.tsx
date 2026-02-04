"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Loader2, Pencil, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SortableRow from "@/components/sortable-table";
import { useParams, useRouter } from "next/navigation";

type PracticeItem = {
  id: number;
  title: string;
  duration: number;
  order: number;
  category: string;
};

type PracticePlan = {
  id: number;
  name: string;
  description?: string | null;
  workspaceId?: string | null;
  sourceNoteSlug?: string | null;
  sourceNoteTitle?: string | null;
  items: PracticeItem[];
};

export default function PracticePlanView() {
  const params = useParams();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [items, setItems] = useState<PracticeItem[]>([]);
  const sensors = useSensors(useSensor(PointerSensor));
  const router = useRouter();

  // 🔹 Load plan + items
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [planRes, itemRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_API}/practice-plans/${id}`, {
            credentials: "include",
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/practice-items/plans/${id}`,
            { credentials: "include" },
          ),
        ]);
        if (!planRes.ok) throw new Error("Failed to fetch plan");
        if (!itemRes.ok) throw new Error("Failed to fetch items");

        const [planJson, itemJson] = await Promise.all([
          planRes.json(),
          itemRes.json(),
        ]);

        if (!cancelled) {
          setPlan(planJson);
          setItems(itemJson);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setPlan(null);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 🔹 Add new item locally (negative temp id)
  const handleAddItem = () => {
    const newItem: PracticeItem = {
      id: -(items.length + 1),
      title: "",
      duration: 0,
      order: items.length + 1,
      category: "GENERAL",
    };
    setItems([...items, newItem]);
    setTimeout(() => {
      const inputs = document.querySelectorAll("input");
      const last = inputs[inputs.length - 1] as HTMLInputElement;
      if (last) last.focus();
    }, 50);
  };

  const handleSave = async () => {
    if (!plan) return;

    try {
      // Update plan info
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/practice-plans/${plan.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: plan.name,
            description: plan.description,
          }),
        },
      );

      // Create or update each item
      for (const item of items) {
        if (item.id < 0) {
          // create new
          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/practice-items/plans/${id}`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                planId: plan.id,
                title: item.title || "Untitled",
                duration: item.duration ?? 0,
                order: item.order,
                category: item.category,
              }),
            },
          );
        } else {
          // update existing
          await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API}/practice-items/${item.id}`,
            {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: item.title,
                duration: item.duration,
                order: item.order,
                category: item.category,
              }),
            },
          );
        }
      }

      const refreshed = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API}/practice-items/plans/${plan.id}`,
        { credentials: "include" },
      );
      const refreshedItems = await refreshed.json();
      setItems(refreshedItems);

      setEditMode(false);
    } catch (e) {
      console.error("Failed to save plan:", e);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex).map((i, idx) => ({
      ...i,
      order: idx + 1,
    }));
    setItems(reordered);
  };

  if (loading)
    return (
      <section className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </section>
    );

  if (!plan)
    return (
      <section className="min-h-[70vh] flex items-center justify-center text-destructive">
        Practice plan not found.
      </section>
    );

  return (
    <section className="min-h-[70vh] rounded-xl border bg-background/60 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col">
          {editMode ? (
            <>
              <Input
                className="mb-2 text-2xl font-bold"
                value={plan.name}
                onChange={(e) => setPlan({ ...plan, name: e.target.value })}
              />
              <Textarea
                value={plan.description ?? ""}
                onChange={(e) =>
                  setPlan({ ...plan, description: e.target.value })
                }
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="max-w-20"
                  onClick={() => router.push(`/dashboard/practice/${id}/play`)}
                  variant={"default"}
                >
                  Play
                </Button>
                {plan.sourceNoteSlug && plan.workspaceId && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      router.push(
                        `/dashboard/notebook?slug=${encodeURIComponent(
                          plan.sourceNoteSlug ?? "",
                        )}&workspaceId=${encodeURIComponent(
                          plan.workspaceId ?? "",
                        )}`,
                      )
                    }
                  >
                    Open source note
                  </Button>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{plan.name}</h1>
              <p className="text-sm text-muted-foreground">
                {plan.description}
              </p>
              {plan.sourceNoteTitle ? (
                <p className="text-xs text-muted-foreground">
                  From note: {plan.sourceNoteTitle}
                </p>
              ) : null}
            </>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => (editMode ? handleSave() : setEditMode(true))}
        >
          {editMode ? (
            <>
              <Save className="mr-2 h-4 w-4" /> Save
            </>
          ) : (
            <>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </>
          )}
        </Button>
      </div>

      {/* Items Table */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Practice Items</h2>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12.5">#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    editMode={editMode}
                    items={items}
                    setItems={setItems}
                  />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>

        {editMode && (
          <Button onClick={handleAddItem} variant="secondary" className="mt-3">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        )}
      </div>
    </section>
  );
}
