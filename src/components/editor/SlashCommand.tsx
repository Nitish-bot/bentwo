"use client";

import React from "react";
import {
	Cards,
	CursorClick,
	SquaresFour,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface SlashCommandItem {
	id: string;
	label: string;
	icon: React.ReactNode;
}

const ITEMS: SlashCommandItem[] = [
	{ id: "UCard", label: "Card", icon: <Cards size={16} /> },
	{ id: "UButton", label: "Button", icon: <CursorClick size={16} /> },
	{ id: "UContainer", label: "Container", icon: <SquaresFour size={16} /> },
];

interface SlashCommandProps {
	filter: string;
	selectedIndex: number;
	onSelect: (item: SlashCommandItem) => void;
}

export const SlashCommand = React.forwardRef<
	HTMLDivElement,
	SlashCommandProps
>(({ filter, selectedIndex, onSelect }, ref) => {
	const filtered = ITEMS.filter((item) =>
		item.label.toLowerCase().includes(filter.toLowerCase()),
	);

	if (filtered.length === 0) return null;

	// Clamp selected index to filtered length
	const clampedIndex = Math.min(selectedIndex, filtered.length - 1);

	return (
		<div
			ref={ref}
			className="min-w-[160px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
		>
			<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
				Components
			</div>
			{filtered.map((item, index) => (
				<button
					key={item.id}
					type="button"
					onClick={() => onSelect(item)}
					className={cn(
						"flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors",
						"hover:bg-accent hover:text-accent-foreground",
						index === clampedIndex && "bg-accent text-accent-foreground",
					)}
				>
					<span className="text-muted-foreground">{item.icon}</span>
					<span>{item.label}</span>
				</button>
			))}
		</div>
	);
});

SlashCommand.displayName = "SlashCommand";
