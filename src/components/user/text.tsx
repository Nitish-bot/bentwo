"use client";

import { useNode } from "@craftjs/core";
import type { ComponentPropsWithoutRef } from "react";
import React from "react";
import { cn } from "@/lib/utils";

export interface UTextProps extends ComponentPropsWithoutRef<"div"> {
	text: string;
}

export const UText = React.forwardRef<HTMLDivElement, UTextProps>(
	({ text, className, children, ...props }, ref) => {
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
					"rounded-lg p-4 transition-colors",
					selected && "ring-2 ring-blue-500",
					hovered && !selected && "bg-gray-100",
					className,
				)}
				{...props}
			>
				{text}
			</div>
		);
	},
);

UText.displayName = "UText";

// biome-ignore lint/suspicious/noExplicitAny: Craft.js requires dynamic property assignment
(UText as any).craft = {
	props: {
		text: "Start typing or press '/' for commands...",
	},
	rules: {
		canDrag: () => true,
	},
};
