import { sendMessage } from "@/lib/messaging";
import type { Organization, PlanKey } from "@/types/messages";

export interface OrganizationsData {
	organizations: Organization[];
	plan: PlanKey;
	canWrite: boolean;
}

export const organizationService = {
	async getOrganizations(): Promise<OrganizationsData> {
		return sendMessage<OrganizationsData>({
			type: "GET_ORGANIZATIONS",
		});
	},
};
