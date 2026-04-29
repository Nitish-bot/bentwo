"use client";

import { useNode } from "@craftjs/core";
import type { ComponentPropsWithoutRef } from "react";
import React from "react";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface UCardProps extends ComponentPropsWithoutRef<"div"> {
	title: string;
	description: string;
}

export const UCard = React.forwardRef<HTMLDivElement, UCardProps>(
	({ title, description, className, children, ...props }, ref) => {
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
					"rounded-lg transition-colors",
					selected && "ring-2 ring-blue-500",
					hovered && !selected && "bg-gray-100",
					className,
				)}
				{...props}
			>
				<Card>
					<CardHeader>
						<CardTitle>{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	},
);

UCard.displayName = "UCard";

// biome-ignore lint/suspicious/noExplicitAny: Craft.js requires dynamic property assignment
(UCard as any).craft = {
	props: {
		title: "Card Title",
		description: "Card description goes here.",
	},
	rules: {
		canDrag: () => true,
	},
};
