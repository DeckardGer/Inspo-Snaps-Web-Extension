import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
import type { Organization } from "@/types/messages";

export const organizationService = {
	async getAll(): Promise<Organization[]> {
		const response = await fetch(
			`${INSPO_SNAPS_DOMAIN}/api/extension/organizations`,
			{
				credentials: "include",
			},
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch organizations: ${response.status}`);
		}

		const data = await response.json();
		return data.organizations;
	},
};
