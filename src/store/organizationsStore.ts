import { create } from "zustand";
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
	setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
}));
