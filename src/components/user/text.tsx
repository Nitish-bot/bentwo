"use client";

import { useEditor, useNode } from "@craftjs/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SlashCommand } from "@/components/editor/SlashCommand";
import { UButton } from "@/components/user/button";
import { UCard } from "@/components/user/card";
import { UContainer } from "@/components/user/container";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "Start typing or press '/' for commands...";

export interface UTextProps {
	text: string;
	className?: string;
}

export const UText = React.forwardRef<HTMLDivElement, UTextProps>(
	({ text, className }, ref) => {
		const [isEditing, setIsEditing] = useState(true);
		const [isSlashMode, setIsSlashMode] = useState(false);
		const [slashFilter, setSlashFilter] = useState("");
		const [selectedIndex, setSelectedIndex] = useState(0);
		const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
		const editableRef = useRef<HTMLDivElement | null>(null);
		const hasTypedRef = useRef(false);

		const {
			id,
			connectors: { connect, drag },
			selected,
			hovered,
			actions: { setProp },
		} = useNode((node) => ({
			id: node.id,
			selected: node.events.selected,
			hovered: node.events.hovered,
		}));

		const { actions: editorActions, query } = useEditor();

		// Auto-focus on mount (editor starts with text focused)
		useEffect(() => {
			const el = editableRef.current;
			if (el) {
				el.focus();
				// Place cursor at end
				const range = document.createRange();
				range.selectNodeContents(el);
				range.collapse(false);
				const sel = window.getSelection();
				sel?.removeAllRanges();
				sel?.addRange(range);
			}
		}, []);

		// Enter edit mode when selected
		useEffect(() => {
			if (selected && !isEditing) {
				setIsEditing(true);
			}
		}, [selected, isEditing]);

		const replaceWithComponent = useCallback(
			(componentType: string) => {
				const node = query.node(id).get();
				const parentId = node.data.parent;
				if (!parentId) return;

				const siblings = query.node(parentId).get().data.nodes;
				const index = siblings.indexOf(id);

				// Delete current node
				editorActions.delete(id);

				// Create node tree based on component type
				// biome-ignore lint/suspicious/noExplicitAny: Craft.js internal API
				const parsed = (query as any).parseReactElement(
					componentType === "UCard" ? (
						<UCard title="Card Title" description="Card description" />
					) : componentType === "UContainer" ? (
						<UContainer />
					) : (
						<UButton label="Button" />
					),
				);
				const nodeTree = parsed.toNodeTree ? parsed.toNodeTree() : parsed;

				// Add at same position
				editorActions.addNodeTree(nodeTree, parentId, index);
			},
			[id, query, editorActions],
		);

		const handleInput = useCallback(() => {
			const el = editableRef.current;
			if (!el) return;

			const currentText = el.textContent ?? "";

			// Mark that user has typed real content
			if (currentText.length > 0) {
				hasTypedRef.current = true;
				setProp((props: Record<string, unknown>) => {
					props.text = currentText;
				});
			}

			// Check for slash command
			const lastSlashIndex = currentText.lastIndexOf("/");
			if (lastSlashIndex !== -1) {
				const afterSlash = currentText.slice(lastSlashIndex + 1);
				if (!afterSlash.includes(" ")) {
					setIsSlashMode(true);
					setSlashFilter(afterSlash);
					setSelectedIndex(0);

					const rect = el.getBoundingClientRect();
					setDropdownPos({
						top: rect.bottom + window.scrollY,
						left: rect.left + window.scrollX,
					});
					return;
				}
			}
			setIsSlashMode(false);
			setSlashFilter("");
		}, [setProp]);

		const handleBlur = useCallback(() => {
			const el = editableRef.current;
			if (el) {
				const newText = el.textContent ?? "";
				setProp((props: Record<string, unknown>) => {
					props.text = newText;
				});
			}
			setIsEditing(false);
			setIsSlashMode(false);
			setSlashFilter("");
		}, [setProp]);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLDivElement>) => {
				if (isSlashMode) {
					if (e.key === "Escape") {
						e.preventDefault();
						setIsSlashMode(false);
						setSlashFilter("");
					} else if (e.key === "ArrowDown") {
						e.preventDefault();
						setSelectedIndex((prev) => prev + 1);
					} else if (e.key === "ArrowUp") {
						e.preventDefault();
						setSelectedIndex((prev) => Math.max(prev - 1, 0));
					} else if (e.key === "Enter") {
						e.preventDefault();
						const items = ["UCard", "UButton", "UContainer"];
						const filtered = items.filter((item) =>
							item
								.replace("U", "")
								.toLowerCase()
								.includes(slashFilter.toLowerCase()),
						);
						if (filtered[selectedIndex]) {
							replaceWithComponent(filtered[selectedIndex]);
						}
					}
				} else if (e.key === "Escape") {
					setIsEditing(false);
				}
			},
			[isSlashMode, slashFilter, selectedIndex, replaceWithComponent],
		);

		const handleSlashSelect = useCallback(
			(item: { id: string }) => {
				replaceWithComponent(item.id);
			},
			[replaceWithComponent],
		);

		return (
			<div className="relative">
				{isEditing ? (
					// biome-ignore lint/a11y/noStaticElementInteractions: contentEditable handles interactivity
					<div
						ref={(dom) => {
							if (typeof ref === "function") {
								ref(dom);
							} else if (ref) {
								ref.current = dom;
							}
							if (dom) {
								editableRef.current = dom;
							}
						}}
						contentEditable
						suppressContentEditableWarning
						onInput={handleInput}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						data-placeholder={PLACEHOLDER}
						className={cn(
							"rounded-lg px-3 py-2 outline-none ring-2 ring-blue-300",
							"empty:before:pointer-events-none empty:before:text-muted-foreground",
							"empty:before:content-[attr(data-placeholder)]",
							className,
						)}
						style={{ minHeight: "2.5rem" }}
					/>
				) : (
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
							"rounded-lg px-3 py-2 transition-colors",
							selected && "ring-2 ring-blue-500",
							hovered && !selected && "bg-gray-100",
							!text && "text-muted-foreground",
							className,
						)}
						style={{ minHeight: "2.5rem" }}
					>
						{text || PLACEHOLDER}
					</div>
				)}
				{isSlashMode &&
					isEditing &&
					createPortal(
						<div
							className="fixed z-[9999]"
							style={{
								top: dropdownPos.top,
								left: dropdownPos.left,
							}}
						>
							<SlashCommand
								filter={slashFilter}
								selectedIndex={selectedIndex}
								onSelect={handleSlashSelect}
							/>
						</div>,
						document.body,
					)}
			</div>
		);
	},
);

UText.displayName = "UText";

// biome-ignore lint/suspicious/noExplicitAny: Craft.js requires dynamic property assignment
(UText as any).craft = {
	props: {
		text: "",
	},
	rules: {
		canDrag: () => true,
	},
};
