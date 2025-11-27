// Core domain types for folder trees
export interface Folder {
	id: string;
	name: string;
	folders: Folder[];
}

export interface FlattenedFolder {
	folder: Folder;
	path: string[];
	depth: number;
}
