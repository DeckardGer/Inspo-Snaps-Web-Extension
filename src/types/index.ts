export interface Message {
	type: MessageTypeType;
	payload?: unknown;
}

export const MessageType = {
	SITE_STATE_UPDATED: "SITE_STATE_UPDATED",
	SAVE_IMAGE: "SAVE_IMAGE",
	// Folder operations
	GET_FOLDERS: "GET_FOLDERS",
	CREATE_FOLDER: "CREATE_FOLDER",
	UPDATE_FOLDER: "UPDATE_FOLDER",
	DELETE_FOLDER: "DELETE_FOLDER",
	// Image operations
	GET_IMAGES: "GET_IMAGES",
	SAVE_IMAGES: "SAVE_IMAGES",
	DELETE_IMAGE: "DELETE_IMAGE",
	MOVE_IMAGE: "MOVE_IMAGE",
	// Broadcast events
	FOLDERS_CHANGED: "FOLDERS_CHANGED",
	IMAGES_CHANGED: "IMAGES_CHANGED",
} as const;

export type MessageTypeType = (typeof MessageType)[keyof typeof MessageType];

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type Folder = {
	name: string;
	id: string;
	folders: Folder[];
};

export type FlattenedFolder = {
	folder: Folder;
	path: string[];
	depth: number;
};

export type CapturedImage = {
	id: string;
	src: string;
};

export type ImageCaptureData = {
	src: string;
	rect: DOMRect;
};

export type FlyingImageData = ImageCaptureData & {
	id: string;
};

// Storage types (flat structure for IndexedDB)
export type StoredFolder = {
	id: string;
	name: string;
	parentId: string | null;
	createdAt: number;
	updatedAt: number;
};

export type StoredImage = {
	id: string;
	folderId: string | null;
	src: string;
	createdAt: number;
	metadata?: {
		width?: number;
		height?: number;
		originalUrl?: string;
	};
};
