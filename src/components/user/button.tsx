"use client";

import { useNode } from "@craftjs/core";
import type { ComponentPropsWithoutRef } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UButtonProps extends ComponentPropsWithoutRef<"div"> {
	label: string;
}

export const UButton = React.forwardRef<HTMLDivElement, UButtonProps>(
	({ label, className, children, ...props }, ref) => {
		const {
			connectors: { connect, drag },
			selected,
			hovered,
		} = useNode((node) => ({
			selected: node.events.selected,
			hovered: node.events.hovered,
		}));

		return (
			<div
				ref={(dom) => {
					if (typeof ref === "function") {
						ref(dom);
					} else if (ref) {
						ref.current = dom;
					}
					if (dom) {
						connect(drag(dom));
					}
				}}
				className={cn(
					"inline-flex rounded-lg transition-colors",
					selected && "ring-2 ring-blue-500",
					hovered && !selected && "bg-gray-100",
					className,
				)}
				{...props}
			>
				<Button>{label}</Button>
			</div>
		);
	},
);

UButton.displayName = "UButton";

// biome-ignore lint/suspicious/noExplicitAny: Craft.js requires dynamic property assignment
(UButton as any).craft = {
	props: {
		label: "Button",
	},
	rules: {
		canDrag: () => true,
	},
};
