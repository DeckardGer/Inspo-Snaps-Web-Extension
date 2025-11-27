// Re-export everything from domain-specific type files
export * from "./domain";
export * from "./messages";
export * from "./storage";
export * from "./ui";

// Keep MessageType const for backward compatibility during migration
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
