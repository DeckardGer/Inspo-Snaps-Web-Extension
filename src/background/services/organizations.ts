import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
import type { Organization, PlanKey } from "@/types/messages";

export interface OrganizationsResponse {
	organizations: Organization[];
	plan: PlanKey;
	canWrite: boolean;
}

export const organizationService = {
	async getAll(): Promise<OrganizationsResponse> {
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
		return {
			organizations: data.organizations,
			plan: data.plan ?? "none",
			canWrite: data.canWrite ?? false,
		};
	},
};
