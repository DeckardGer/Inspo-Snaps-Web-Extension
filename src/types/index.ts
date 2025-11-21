export interface Message {
	type: MessageTypeType;
	payload?: unknown;
}

export const MessageType = {
	SITE_STATE_UPDATED: "SITE_STATE_UPDATED",
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
