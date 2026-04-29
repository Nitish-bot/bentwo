import type { ComponentPropsWithoutRef } from "react";
import { Button } from "@/components/ui/button";

type UButtonProps = ComponentPropsWithoutRef<typeof Button>;

export const UButton = (props: UButtonProps) => {
	return <Button {...props} />;
};
