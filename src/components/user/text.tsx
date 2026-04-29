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
		const prevIsEditingRef = useRef(true);
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

		// Single ref callback — register drag once, persist DOM ref
		const setDomRef = useCallback(
			(dom: HTMLDivElement | null) => {
				if (typeof ref === "function") {
					ref(dom);
				} else if (ref) {
					ref.current = dom;
				}
				if (dom) {
					editableRef.current = dom;
					connect(drag(dom));
				}
			},
			[ref, connect, drag],
		);

		// Sync saved text and focus when transitioning into edit mode
		useEffect(() => {
			const el = editableRef.current;
			if (isEditing && el) {
				if (!prevIsEditingRef.current) {
					el.textContent = text;
					el.focus();
					const range = document.createRange();
					range.selectNodeContents(el);
					range.collapse(false);
					const sel = window.getSelection();
					sel?.removeAllRanges();
					sel?.addRange(range);
				}
				prevIsEditingRef.current = true;
			} else {
				prevIsEditingRef.current = false;
			}
		}, [isEditing, text]);

		// Enter edit mode when node becomes selected
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

				editorActions.delete(id);

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
				const nodeTree = parsed.toNodeTree
					? parsed.toNodeTree()
					: parsed;

				editorActions.addNodeTree(nodeTree, parentId, index);
			},
			[id, query, editorActions],
		);

		const handleInput = useCallback(() => {
			const el = editableRef.current;
			if (!el) return;

			const currentText = el.textContent ?? "";

			if (currentText.length > 0) {
				hasTypedRef.current = true;
				setProp((props: Record<string, unknown>) => {
					props.text = currentText;
				});
			}

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
				} else if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					const el = editableRef.current;
					if (!el) return;
					const sel = window.getSelection();
					if (sel && sel.rangeCount > 0) {
						const range = sel.getRangeAt(0);
						const br = document.createElement("br");
						range.deleteContents();
						range.insertNode(br);
						// Move cursor after the <br>
						range.setStartAfter(br);
						range.setEndAfter(br);
						sel.removeAllRanges();
						sel.addRange(range);
					}
					// Trigger input to save the newline
					handleInput();
				} else if (e.key === "Escape") {
					setIsEditing(false);
				}
			},
			[isSlashMode, slashFilter, selectedIndex, replaceWithComponent, handleInput],
		);

		const handleSlashSelect = useCallback(
			(item: { id: string }) => {
				replaceWithComponent(item.id);
			},
			[replaceWithComponent],
		);

		const handleMouseDown = useCallback(
			(e: React.MouseEvent<HTMLDivElement>) => {
				if (!isEditing) {
					// Prevent parent container selection and drag start
					e.stopPropagation();
					e.preventDefault();
					setIsEditing(true);
				}
			},
			[isEditing],
		);

		return (
			<div className="relative">
				<div
					ref={setDomRef}
					contentEditable={isEditing}
					suppressContentEditableWarning
					onMouseDown={handleMouseDown}
					onInput={handleInput}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					data-placeholder={PLACEHOLDER}
					className={cn(
						"rounded-lg px-3 py-2 transition-colors",
						isEditing
							? "outline-none ring-2 ring-blue-300 cursor-text"
							: "cursor-text",
						!isEditing && selected && "ring-2 ring-blue-500",
						!isEditing && hovered && !selected && "bg-gray-100",
						!isEditing && !text && "text-muted-foreground",
						"empty:before:pointer-events-none empty:before:text-muted-foreground",
						"empty:before:content-[attr(data-placeholder)]",
						className,
					)}
					style={{ minHeight: "2.5rem" }}
				>
					{!isEditing ? text || PLACEHOLDER : undefined}
				</div>
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
