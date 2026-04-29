import { init } from "@instantdb/react";
import schema from "@/lib/instant.schema";

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
if (!appId) {
	throw Error("No app id provided for instant db");
}

export const db = init({
	appId,
	schema,
	useDateObjects: true,
});
