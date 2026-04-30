"use client";

import { useEditor } from "@craftjs/core";
import { useEffect } from "react";

export function useEditorShortcuts() {
	const { actions, query } = useEditor();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			const isEditingText =
				target?.closest('[contenteditable="true"]') !== null;

			// Undo / Redo — always available
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) {
					actions.history.redo();
				} else {
					actions.history.undo();
				}
				return;
			}

			// Escape — deselect when not editing text
			if (e.key === "Escape" && !isEditingText) {
				e.preventDefault();
				actions.selectNode("");
				return;
			}

			// Delete / Backspace — remove selected node when not editing text
			if ((e.key === "Delete" || e.key === "Backspace") && !isEditingText) {
				const selectedId = query.getEvent("selected").first();
				if (selectedId) {
					e.preventDefault();
					actions.delete(selectedId);
				}
				return;
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [actions, query]);
}
