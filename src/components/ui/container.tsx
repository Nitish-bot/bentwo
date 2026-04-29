import type { CSSProperties, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

type ResizeMode = "none" | "horizontal" | "vertical" | "both";

export type ContainerProps = PropsWithChildren<{
	backgroundColor?: string;
	width?: number | string;
	height?: number | string;
	minHeight?: number | string;
	padding?: number;
	borderRadius?: number;
	resize?: ResizeMode;
	className?: string;
}>;

export function Container({
	children,
	backgroundColor = "transparent",
	width = "100%",
	minHeight = 120,
	padding = 16,
	borderRadius = 12,
	resize = "both",
	height,
	className,
}: ContainerProps) {
	const style: CSSProperties = {
		backgroundColor,
		width,
		height,
		minHeight,
		padding,
		borderRadius,
		resize,
	};

	return (
		<div
			className={cn(
				"overflow-auto border border-dashed border-border transition-colors",
				"focus-within:border-ring",
				className,
			)}
			style={style}
		>
			{children}
		</div>
	);
}
