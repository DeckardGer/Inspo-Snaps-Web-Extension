import type { StoredFolder, StoredImage } from "./storage";

// Auth session type (matches Better Auth response)
export interface AuthSession {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
	session: {
		id: string;
		expiresAt: string;
	};
}

// Discriminated union for all message types
export type Message =
	// Folder operations
	| { type: "GET_FOLDERS" }
	| {
			type: "CREATE_FOLDER";
			payload: { name: string; parentId: string | null };
	  }
	| {
			type: "UPDATE_FOLDER";
			payload: {
				id: string;
				updates: Partial<Pick<StoredFolder, "name" | "parentId">>;
			};
	  }
	| { type: "DELETE_FOLDER"; payload: { id: string } }
	// Image operations
	| { type: "GET_IMAGES"; payload: { folderId: string | null } }
	| {
			type: "SAVE_IMAGES";
			payload: { images: Array<Omit<StoredImage, "id" | "createdAt">> };
	  }
	| { type: "DELETE_IMAGE"; payload: { id: string } }
	| {
			type: "MOVE_IMAGE";
			payload: { imageId: string; folderId: string | null };
	  }
	// Auth operations (proxied through background script to avoid CORS)
	| { type: "AUTH_GET_SESSION" }
	// API proxy (all API requests go through background script to avoid CORS)
	| {
			type: "API_REQUEST";
			payload: {
				endpoint: string;
				method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
				body?: unknown;
			};
	  }
	// Broadcast events
	| { type: "FOLDERS_CHANGED" }
	| { type: "IMAGES_CHANGED" }
	// Extension events
	| { type: "SITE_STATE_UPDATED"; payload: boolean }
	| { type: "SAVE_IMAGE"; payload: string };

// Response types
export type ServiceResponse<T> =
	| { success: true; data: T }
	| { success: false; error: ServiceError };

export interface ServiceError {
	message: string;
	code?: string;
	cause?: Error;
}

// Specific response types
export type GetFoldersResponse = ServiceResponse<{ folders: StoredFolder[] }>;
export type CreateFolderResponse = ServiceResponse<{ folder: StoredFolder }>;
export type UpdateFolderResponse = ServiceResponse<{ folder: StoredFolder }>;
export type DeleteFolderResponse = ServiceResponse<void>;
export type GetImagesResponse = ServiceResponse<{ images: StoredImage[] }>;
export type SaveImagesResponse = ServiceResponse<{ images: StoredImage[] }>;
export type DeleteImageResponse = ServiceResponse<void>;
export type MoveImageResponse = ServiceResponse<{ image: StoredImage }>;
export type AuthGetSessionResponse = ServiceResponse<{
	session: AuthSession | null;
}>;
export type ApiRequestResponse<T = unknown> = ServiceResponse<{
	data: T;
	status: number;
}>;
