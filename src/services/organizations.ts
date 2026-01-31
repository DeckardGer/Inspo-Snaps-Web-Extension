import { sendMessage } from "@/lib/messaging";
import type { Organization } from "@/types/messages";

export const organizationService = {
	async getOrganizations(): Promise<Organization[]> {
		const { organizations } = await sendMessage<{
			organizations: Organization[];
		}>({
			type: "GET_ORGANIZATIONS",
		});
		return organizations;
	},
};
