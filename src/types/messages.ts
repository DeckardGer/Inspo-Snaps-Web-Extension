import type { StoredFolder, StoredImage } from "./storage";

// Plan types (matches website's Better Auth customSession)
export type PlanKey = "none" | "trial" | "pro" | "team";

// Organizations
export type OrganizationRole = "member" | "viewer" | "admin";

export interface Organization {
	id: string;
	name: string;
	slug: string;
	logo: string;
	role: OrganizationRole;
}

// Auth session type (matches Better Auth response with customSession plugin)
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
		updatedAt: string;
		plan: PlanKey;
		canWrite: boolean;
	};
}

// Discriminated union for all message types
export type Message =
	// Folder operations
	| { type: "GET_FOLDERS"; payload?: { organizationId?: string | null } }
	| {
			type: "CREATE_FOLDER";
			payload: {
				name: string;
				parentId: string | null;
				organizationId?: string | null;
			};
	  }
	| {
			type: "UPDATE_FOLDER";
			payload: {
				id: string;
				updates: Partial<Pick<StoredFolder, "name" | "parentId">>;
				organizationId?: string | null;
			};
	  }
	| {
			type: "DELETE_FOLDER";
			payload: { id: string; organizationId?: string | null };
	  }
	// Image operations
	| {
			type: "GET_IMAGES";
			payload: { folderId: string | null; organizationId?: string | null };
	  }
	| {
			type: "SAVE_IMAGES";
			payload: {
				images: Array<Omit<StoredImage, "id" | "createdAt">>;
				organizationId?: string | null;
			};
	  }
	| {
			type: "DELETE_IMAGE";
			payload: { id: string; organizationId?: string | null };
	  }
	| {
			type: "MOVE_IMAGE";
			payload: {
				imageId: string;
				folderId: string;
				organizationId?: string | null;
			};
	  }
	// Organization operations
	| { type: "GET_ORGANIZATIONS" }
	// Auth operations
	| { type: "AUTH_GET_SESSION"; payload?: { forceRefresh?: boolean } }
	| { type: "AUTH_SESSION_UPDATED"; payload: { session: AuthSession | null } }
	| { type: "AUTH_BRIDGE_UPDATE"; payload: { session: AuthSession | null } }
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
export type GetOrganizationsResponse = ServiceResponse<{
	organizations: Organization[];
	plan: PlanKey;
	canWrite: boolean;
}>;
export type AuthGetSessionResponse = ServiceResponse<{
	session: AuthSession | null;
}>;
