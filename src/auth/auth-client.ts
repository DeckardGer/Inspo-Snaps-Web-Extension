import { createAuthClient } from "better-auth/react";
import { INSPO_SNAPS_DOMAIN } from "@/lib/config";

export const authClient = createAuthClient({
	baseURL: INSPO_SNAPS_DOMAIN /* Base URL of your Better Auth backend. */,
	plugins: [],
});
