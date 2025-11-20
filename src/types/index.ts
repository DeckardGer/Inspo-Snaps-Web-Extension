export interface ExtensionState {
	sites: Record<string, boolean>;
}

export interface Message {
	type: MessageTypeType;
	payload?: unknown;
}

export const MessageType = {
	TOGGLE_SITE: "TOGGLE_SITE",
	GET_SITE_STATE: "GET_SITE_STATE",
	SITE_STATE_UPDATED: "SITE_STATE_UPDATED",
	ACTIVATE_PICKER: "ACTIVATE_PICKER",
	DEACTIVATE_PICKER: "DEACTIVATE_PICKER",
	DOWNLOAD_IMAGE: "DOWNLOAD_IMAGE",
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

// export interface ImageInfo {
// 	url: string;
// 	width: number;
// 	height: number;
// 	alt?: string;
// 	naturalWidth?: number;
// 	naturalHeight?: number;
// }
