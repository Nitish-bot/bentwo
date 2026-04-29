"use client";

import { useNode } from "@craftjs/core";
import React from "react";
import { cn } from "@/lib/utils";

export interface UContainerProps {
	className?: string;
	children?: React.ReactNode;
}

export const UContainer = React.forwardRef<HTMLDivElement, UContainerProps>(
	({ className, children }, ref) => {
		const {
			connectors: { connect, drag },
			selected,
		} = useNode((node) => ({
			selected: node.events.selected,
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
					"flex min-h-[40px] flex-col",
					selected && "ring-2 ring-blue-500",
					className,
				)}
			>
				{children}
			</div>
		);
	},
);

UContainer.displayName = "UContainer";

// biome-ignore lint/suspicious/noExplicitAny: Craft.js requires dynamic property assignment
(UContainer as any).craft = {
	props: {},
	rules: {
		canDrag: () => true,
		canDrop: () => true,
	},
};
