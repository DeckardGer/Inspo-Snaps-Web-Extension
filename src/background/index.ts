import browser from "webextension-polyfill";
import { ENABLED_SITES_KEY } from "@/lib/constants";
import { MessageType } from "@/types";

const getEnabledSites = async (): Promise<Record<string, boolean>> => {
	const stored = await browser.storage.local.get(ENABLED_SITES_KEY);

	return (stored[ENABLED_SITES_KEY] as Record<string, boolean>) || {};
};

const toggleSite = async (hostname: string): Promise<boolean> => {
	const sites = await getEnabledSites();
	const newState = !sites[hostname];

	if (newState) {
		sites[hostname] = true;
	} else {
		delete sites[hostname];
	}

	await browser.storage.local.set({ [ENABLED_SITES_KEY]: sites });

	return newState;
};

// Handle extension icon click
browser.action.onClicked.addListener(async (tab) => {
	if (!tab.url || !tab.id) return;

	const hostname = new URL(tab.url).hostname;
	const newState = await toggleSite(hostname);

	browser.tabs.sendMessage(tab.id, {
		type: MessageType.SITE_STATE_UPDATED,
		payload: newState,
	});
});
