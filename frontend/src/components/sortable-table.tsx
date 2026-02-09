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
  targetType?: "NOTE" | "SONG" | null;
  targetRefId?: string | null;
};

type NoteOption = { id: string; title: string };
type SongOption = { id: number; title: string; artist?: string | null };

const categories = [
  "WARMUP",
  "CHORDS",
  "SCALES",
  "SONGS",
  "THEORY",
  "EAR_TRAINING",
  "COOL_DOWN",
];

export default function SortableRow({
  item,
  editMode,
  items,
  setItems,
  notes,
  songs,
}: {
  item: PracticeItem;
  editMode: boolean;
  items: PracticeItem[];
  setItems: (items: PracticeItem[]) => void;
  notes: NoteOption[];
  songs: SongOption[];
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

  const linkType =
    item.targetType === "NOTE" || item.targetType === "SONG"
      ? item.targetType
      : "NONE";

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
            value={item.category || "WARMUP"}
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

      <TableCell>
        {editMode ? (
          <Select
            value={linkType}
            onValueChange={(value) => {
              const nextType = value === "NONE" ? null : (value as "NOTE" | "SONG");
              updateItem({
                ...item,
                targetType: nextType,
                targetRefId: nextType ? item.targetRefId ?? null : null,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="NOTE">Note</SelectItem>
              <SelectItem value="SONG">Song</SelectItem>
            </SelectContent>
          </Select>
        ) : linkType === "NONE" ? (
          <span className="text-muted-foreground">None</span>
        ) : (
          <span className="capitalize">{linkType.toLowerCase()}</span>
        )}
      </TableCell>

      <TableCell>
        {editMode ? (
          linkType === "NOTE" ? (
            <Select
              value={item.targetRefId ?? ""}
              onValueChange={(value) => {
                const note = notes.find((n) => n.id === value);
                updateItem({
                  ...item,
                  targetRefId: value,
                  title: note?.title ?? item.title,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select note" />
              </SelectTrigger>
              <SelectContent>
                {notes.map((note) => (
                  <SelectItem key={note.id} value={note.id}>
                    {note.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : linkType === "SONG" ? (
            <Select
              value={item.targetRefId ?? ""}
              onValueChange={(value) => {
                const song = songs.find((s) => String(s.id) === value);
                updateItem({
                  ...item,
                  targetRefId: value,
                  title: song?.title ?? item.title,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select song" />
              </SelectTrigger>
              <SelectContent>
                {songs.map((song) => (
                  <SelectItem key={song.id} value={String(song.id)}>
                    {song.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground">No link</span>
          )
        ) : linkType === "NOTE" ? (
          <span className="text-muted-foreground">
            {item.title || "Linked note"}
          </span>
        ) : linkType === "SONG" ? (
          <span className="text-muted-foreground">
            {item.title || "Linked song"}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}
