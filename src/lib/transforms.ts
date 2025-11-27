import type { FlattenedFolder, Folder, StoredFolder } from "@/types";

// Helper: Convert flat StoredFolder[] to nested Folder[]
export const buildFolderTree = (flatFolders: StoredFolder[]): Folder[] => {
	const folderMap = new Map<string, Folder>();

	// Create Folder objects (without children first)
	for (const stored of flatFolders) {
		folderMap.set(stored.id, {
			id: stored.id,
			name: stored.name,
			folders: [],
		});
	}

	// Build tree structure
	const rootFolders: Folder[] = [];

	for (const stored of flatFolders) {
		const folder = folderMap.get(stored.id);
		if (!folder) continue;

		if (stored.parentId === null) {
			rootFolders.push(folder);
		} else {
			const parent = folderMap.get(stored.parentId);
			if (parent) {
				parent.folders.push(folder);
			} else {
				// Parent not found, treat as root
				rootFolders.push(folder);
			}
		}
	}

	// Sort folders alphabetically at each level
	const sortFolders = (folders: Folder[]): Folder[] => {
		folders.sort((a, b) => a.name.localeCompare(b.name));
		for (const folder of folders) {
			sortFolders(folder.folders);
		}
		return folders;
	};

	return sortFolders(rootFolders);
};

// Flattens the folder tree for search
export function flattenFolders(
	folders: Folder[],
	path: string[] = [],
	depth = 0,
): FlattenedFolder[] {
	const result: FlattenedFolder[] = [];

	for (const folder of folders) {
		const currentPath = [...path, folder.name];
		result.push({ folder, path: currentPath, depth });

		if (folder.folders.length > 0) {
			result.push(...flattenFolders(folder.folders, currentPath, depth + 1));
		}
	}

	return result;
}
