"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PracticeItem = {
  id: number;
  title: string;
  duration: number;
  order: number;
  category: string;
};

const categories = ["CHORDS", "SCALES", "RHYTHM", "EAR_TRAINING", "GENERAL"];

export default function SortableRow({
  item,
  editMode,
  items,
  setItems,
}: {
  item: PracticeItem;
  editMode: boolean;
  items: PracticeItem[];
  setItems: (items: PracticeItem[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const updateItem = (updatedItem: PracticeItem) => {
    const updated = items.map((i) => (i.id === item.id ? updatedItem : i));
    setItems(updated);
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="text-center">
        {editMode && (
          <GripVertical
            className="inline-block mr-2 cursor-grab text-muted-foreground"
            {...attributes}
            {...listeners}
          />
        )}
        {item.order}
      </TableCell>

      <TableCell>
        {editMode ? (
          <Input
            value={item.title}
            onChange={(e) => updateItem({ ...item, title: e.target.value })}
          />
        ) : (
          item.title
        )}
      </TableCell>

      <TableCell>
        {editMode ? (
          <Input
            type="number"
            value={item.duration}
            onChange={(e) =>
              updateItem({ ...item, duration: Number(e.target.value) })
            }
          />
        ) : (
          `${item.duration} min`
        )}
      </TableCell>

      <TableCell>
        {editMode ? (
          <Select
            value={item.category || "GENERAL"}
            onValueChange={(value) => updateItem({ ...item, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="capitalize">{item.category.replace("_", " ")}</span>
        )}
      </TableCell>
    </TableRow>
  );
}
