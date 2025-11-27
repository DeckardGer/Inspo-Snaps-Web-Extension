import type { StoredFolder, StoredImage } from "./storage";

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
