import { useEffect } from "react";
import browser from "webextension-polyfill";
import { organizationService } from "@/services/organizations";
import { useAuthStore } from "@/store/authStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import type { Message } from "@/types";

export const useOrganizationSync = () => {
	const { setOrganizations, setOrganizationsData } = useOrganizationsStore();

	useEffect(() => {
		// Initial fetch only if logged in
		if (useAuthStore.getState().session) {
			organizationService
				.getOrganizations()
				.then(setOrganizationsData)
				.catch(console.error);
		}

		// Listen for auth updates
		const handleMessage = (message: Message) => {
			if (message.type === "AUTH_SESSION_UPDATED") {
				if (useAuthStore.getState().session) {
					organizationService
						.getOrganizations()
						.then(setOrganizationsData)
						.catch(console.error);
				} else {
					setOrganizations(null);
				}
			}
		};

		browser.runtime.onMessage.addListener(handleMessage);

		return () => {
			browser.runtime.onMessage.removeListener(handleMessage);
		};
	}, [setOrganizations, setOrganizationsData]);
};
