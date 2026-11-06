import type { Timestamp } from 'firebase/firestore';

/** `users/{uid}/folders/{folderId}` (see docs/README.md → Data model). */
export interface Folder {
  id: string;
  name: string;
  /** Null for a root folder. Only one level of nesting is allowed (decision #6). */
  parentId: string | null;
  order: number;
  createdAt: Timestamp | null;
}
