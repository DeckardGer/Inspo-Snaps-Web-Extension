import { useEffect } from "react";
import browser from "webextension-polyfill";
import { folderService } from "@/services/folders";
import { useAuthStore } from "@/store/authStore";
import { useFoldersStore } from "@/store/foldersStore";
import type { Message } from "@/types";

export const useFolderSync = () => {
	const { setFolders } = useFoldersStore();

	useEffect(() => {
		// Initial fetch
		folderService.getFolders().then(setFolders).catch(console.error);

		// Listen for changes from other tabs and auth updates
		const handleMessage = (message: Message) => {
			if (message.type === "FOLDERS_CHANGED") {
				folderService.getFolders().then(setFolders).catch(console.error);
			} else if (message.type === "AUTH_SESSION_UPDATED") {
				if (useAuthStore.getState().session) {
					folderService.getFolders().then(setFolders).catch(console.error);
				} else {
					setFolders([]);
				}
			}
		};

		browser.runtime.onMessage.addListener(handleMessage);

		return () => {
			browser.runtime.onMessage.removeListener(handleMessage);
		};
	}, [setFolders]);
};
