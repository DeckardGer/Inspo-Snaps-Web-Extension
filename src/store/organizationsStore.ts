import browser from "webextension-polyfill";
import { create } from "zustand";
import { ACTIVE_ORG_KEY } from "@/lib/constants";
import type { Organization, PlanKey } from "@/types/messages";

interface OrganizationsState {
	organizations: Organization[] | null;
	activeOrganizationId: string | null; // null = personal
	plan: PlanKey | null;
	canWrite: boolean;

	// Actions
	setOrganizations: (organizations: Organization[] | null) => void;
	setOrganizationsData: (data: {
		organizations: Organization[];
		plan: PlanKey;
		canWrite: boolean;
	}) => void;
	setActiveOrganizationId: (id: string | null) => void;
}

export const useOrganizationsStore = create<OrganizationsState>((set) => ({
	organizations: null,
	activeOrganizationId: null,
	plan: null,
	canWrite: false,

	setOrganizations: (organizations) => set({ organizations }),
	setOrganizationsData: ({ organizations, plan, canWrite }) =>
		set((state) => {
			const hasTeamWriteAccess = plan === "team" || plan === "trial";
			let activeOrganizationId = state.activeOrganizationId;

			// Reset to personal if the active org is no longer accessible
			if (activeOrganizationId) {
				const activeOrg = organizations.find(
					(o) => o.id === activeOrganizationId,
				);
				if (!activeOrg || activeOrg.role === "viewer" || !hasTeamWriteAccess) {
					activeOrganizationId = null;
					browser.storage.local.set({ [ACTIVE_ORG_KEY]: null });
				}
			}

			return { organizations, plan, canWrite, activeOrganizationId };
		}),
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
