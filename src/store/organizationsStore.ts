import browser from "webextension-polyfill";
import { create } from "zustand";
import { ACTIVE_ORG_KEY } from "@/lib/constants";
import type { Organization } from "@/types/messages";

interface OrganizationsState {
	organizations: Organization[] | null;
	activeOrganizationId: string | null; // null = personal

	// Actions
	setOrganizations: (organizations: Organization[] | null) => void;
	setActiveOrganizationId: (id: string | null) => void;
}

export const useOrganizationsStore = create<OrganizationsState>((set) => ({
	organizations: null,
	activeOrganizationId: null,

	setOrganizations: (organizations) => set({ organizations }),
	setActiveOrganizationId: (id) => {
		set({ activeOrganizationId: id });
		browser.storage.local.set({ [ACTIVE_ORG_KEY]: id });
	},
}));

export const loadActiveOrganizationId = async (): Promise<void> => {
	const stored = await browser.storage.local.get(ACTIVE_ORG_KEY);
	const id = (stored[ACTIVE_ORG_KEY] as string | null) ?? null;
	useOrganizationsStore.setState({ activeOrganizationId: id });
};
