/**
 * documentStore
 *
 * Locally persisted store tracking which documents the user has "uploaded"
 * on the profile page (optimistic UI). The key here is the FormData field
 * name used when uploading (e.g. "id_copy", "kra_certificate", "contract_document").
 *
 * Profile completion is now driven by server data (applicantProfileStore),
 * not this store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DocumentFile {
  key: string;
  fileName: string;
  fileSize: number;
  /** ISO date string */
  uploadedAt: string;
  /** base64 data URL for preview — will be replaced by a server URL */
  previewUrl?: string;
}

interface DocumentState {
  documents: DocumentFile[];
  /** convenience derived list */
  uploadedKeys: string[];
  addDocument: (doc: DocumentFile) => void;
  removeDocument: (key: string) => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      uploadedKeys: [],
      addDocument: (doc) => {
        const existing = get().documents.filter((d) => d.key !== doc.key);
        const next = [...existing, doc];
        set({ documents: next, uploadedKeys: next.map((d) => d.key) });
      },
      removeDocument: (key) => {
        const next = get().documents.filter((d) => d.key !== key);
        set({ documents: next, uploadedKeys: next.map((d) => d.key) });
      },
    }),
    {
      name: "leocap_documents",
    }
  )
);
