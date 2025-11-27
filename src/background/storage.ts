import { generateId } from "@/lib/id";
import type { StoredFolder, StoredImage } from "@/types";

const DB_NAME = "inspo-snaps-db";
const DB_VERSION = 1;

const STORES = {
	FOLDERS: "folders",
	IMAGES: "images",
} as const;

/**
 * Opens a new connection to IndexedDB.
 * IMPORTANT: Always close the connection after use with db.close()
 * This prevents blocking other tabs from accessing the database.
 */
const openDB = (): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);

		request.onsuccess = () => {
			const db = request.result;

			// Critical: Handle versionchange events
			// When another tab tries to upgrade the database, this connection must close
			db.onversionchange = () => {
				db.close();
				console.log(
					"[IndexedDB] Database connection closed due to version change in another tab",
				);
			};

			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create folders store
			if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
				const foldersStore = db.createObjectStore(STORES.FOLDERS, {
					keyPath: "id",
				});
				foldersStore.createIndex("parentId", "parentId", { unique: false });
				foldersStore.createIndex("createdAt", "createdAt", { unique: false });
			}

			// Create images store
			if (!db.objectStoreNames.contains(STORES.IMAGES)) {
				const imagesStore = db.createObjectStore(STORES.IMAGES, {
					keyPath: "id",
				});
				imagesStore.createIndex("folderId", "folderId", { unique: false });
				imagesStore.createIndex("createdAt", "createdAt", { unique: false });
			}
		};
	});
};

// Folder operations
export const getAllFolders = async (): Promise<StoredFolder[]> => {
	const db = await openDB();
	try {
		return await new Promise((resolve, reject) => {
			const transaction = db.transaction(STORES.FOLDERS, "readonly");
			const store = transaction.objectStore(STORES.FOLDERS);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	} finally {
		db.close();
	}
};

export const getFolderById = async (
	id: string,
): Promise<StoredFolder | undefined> => {
	const db = await openDB();
	try {
		return await new Promise((resolve, reject) => {
			const transaction = db.transaction(STORES.FOLDERS, "readonly");
			const store = transaction.objectStore(STORES.FOLDERS);
			const request = store.get(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	} finally {
		db.close();
	}
};

export const createFolder = async (
	name: string,
	parentId: string | null,
): Promise<StoredFolder> => {
	const db = await openDB();
	const now = Date.now();
	const folder: StoredFolder = {
		id: generateId("folder"),
		name,
		parentId,
		createdAt: now,
		updatedAt: now,
	};

	try {
		return await new Promise((resolve, reject) => {
			const transaction = db.transaction(STORES.FOLDERS, "readwrite");
			const store = transaction.objectStore(STORES.FOLDERS);
			const request = store.add(folder);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(folder);
		});
	} finally {
		db.close();
	}
};

export const updateFolder = async (
	id: string,
	updates: Partial<Pick<StoredFolder, "name" | "parentId">>,
): Promise<StoredFolder> => {
	const existing = await getFolderById(id);

	if (!existing) {
		throw new Error(`Folder with id ${id} not found`);
	}

	const updated: StoredFolder = {
		...existing,
		...updates,
		updatedAt: Date.now(),
	};

	const db = await openDB();
	try {
		return await new Promise((resolve, reject) => {
			const transaction = db.transaction(STORES.FOLDERS, "readwrite");
			const store = transaction.objectStore(STORES.FOLDERS);
			const request = store.put(updated);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(updated);
		});
	} finally {
		db.close();
	}
};

export const deleteFolder = async (id: string): Promise<void> => {
	// Get all folders to find children
	const allFolders = await getAllFolders();
	const idsToDelete = new Set<string>([id]);

	// Find all descendant folders recursively
	const findChildren = (parentId: string) => {
		for (const folder of allFolders) {
			if (folder.parentId === parentId && !idsToDelete.has(folder.id)) {
				idsToDelete.add(folder.id);
				findChildren(folder.id);
			}
		}
	};
	findChildren(id);

	// Delete all folders and their images
	const db = await openDB();
	try {
		return await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(
				[STORES.FOLDERS, STORES.IMAGES],
				"readwrite",
			);
			const foldersStore = transaction.objectStore(STORES.FOLDERS);
			const imagesStore = transaction.objectStore(STORES.IMAGES);

			// Delete images in these folders
			const imageIndex = imagesStore.index("folderId");
			for (const folderId of idsToDelete) {
				const imageRequest = imageIndex.openCursor(IDBKeyRange.only(folderId));
				imageRequest.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
						.result;
					if (cursor) {
						cursor.delete();
						cursor.continue();
					}
				};
			}

			// Delete folders
			for (const folderId of idsToDelete) {
				foldersStore.delete(folderId);
			}

			transaction.onerror = () => reject(transaction.error);
			transaction.oncomplete = () => resolve();
		});
	} finally {
		db.close();
	}
};

// Image operations
export const getImagesByFolder = async (
	folderId: string | null,
): Promise<StoredImage[]> => {
	const db = await openDB();
	try {
		return await new Promise((resolve, reject) => {
			const transaction = db.transaction(STORES.IMAGES, "readonly");
			const store = transaction.objectStore(STORES.IMAGES);
			const index = store.index("folderId");
			const request = index.getAll(folderId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	} finally {
		db.close();
	}
};

export const getAllImages = async (): Promise<StoredImage[]> => {
	const db = await openDB();
	try {
		return await new Promise((resolve, reject) => {
			const transaction = db.transaction(STORES.IMAGES, "readonly");
			const store = transaction.objectStore(STORES.IMAGES);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	} finally {
		db.close();
	}
};

export const saveImage = async (
	image: Omit<StoredImage, "id" | "createdAt">,
): Promise<StoredImage> => {
	const db = await openDB();
	const now = Date.now();
	const storedImage: StoredImage = {
		...image,
		id: generateId("image"),
		createdAt: now,
	};

	try {
		return await new Promise((resolve, reject) => {
			const transaction = db.transaction(STORES.IMAGES, "readwrite");
			const store = transaction.objectStore(STORES.IMAGES);
			const request = store.add(storedImage);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(storedImage);
		});
	} finally {
		db.close();
	}
};

export const deleteImage = async (id: string): Promise<void> => {
	const db = await openDB();
	try {
		return await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(STORES.IMAGES, "readwrite");
			const store = transaction.objectStore(STORES.IMAGES);
			const request = store.delete(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	} finally {
		db.close();
	}
};

export const moveImageToFolder = async (
	imageId: string,
	folderId: string | null,
): Promise<StoredImage> => {
	const db = await openDB();

	try {
		// Get existing image
		const getRequest = await new Promise<StoredImage | undefined>(
			(resolve, reject) => {
				const transaction = db.transaction(STORES.IMAGES, "readonly");
				const store = transaction.objectStore(STORES.IMAGES);
				const request = store.get(imageId);

				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve(request.result);
			},
		);

		if (!getRequest) {
			throw new Error(`Image with id ${imageId} not found`);
		}

		const updated: StoredImage = {
			...getRequest,
			folderId,
		};

		return await new Promise((resolve, reject) => {
			const transaction = db.transaction(STORES.IMAGES, "readwrite");
			const store = transaction.objectStore(STORES.IMAGES);
			const request = store.put(updated);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(updated);
		});
	} finally {
		db.close();
	}
};
