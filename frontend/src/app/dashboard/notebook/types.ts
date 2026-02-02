export type NoteListItem = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  updatedAt: string; // ISO
  excerpt?: string;
};

export type Note = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  updatedAt: string; // ISO
  contentMd: string;
};
