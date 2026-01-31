// Storage layer types (flat structure for IndexedDB)
export interface StoredFolder {
	id: string;
	name: string;
	parentId: string | null;
	createdAt: number;
	updatedAt: number;
}

export interface StoredImage {
	id: string;
	folderId: string;
	src: string;
	createdAt: number;
	metadata?: {
		width?: number;
		height?: number;
		originalUrl?: string;
	};
}
