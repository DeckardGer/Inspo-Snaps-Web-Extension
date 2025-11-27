import { create } from "zustand";
import type { Folder } from "@/types";

interface FoldersState {
	folders: Folder[] | null;
	currentFolderId: string | null;

	// Actions
	setFolders: (folders: Folder[] | null) => void;
	setCurrentFolderId: (folderId: string | null) => void;
}

export const useFoldersStore = create<FoldersState>((set) => ({
	folders: null,
	currentFolderId: null,

	setFolders: (folders) => set({ folders }),
	setCurrentFolderId: (folderId) => set({ currentFolderId: folderId }),
}));
