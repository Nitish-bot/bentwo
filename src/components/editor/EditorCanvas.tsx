"use client";

import { Editor, Element, Frame } from "@craftjs/core";
import { UContainer } from "@/components/user/container";
import { UText } from "@/components/user/text";
import { resolver } from "@/lib/resolver";
import { useEditorShortcuts } from "@/hooks/useEditorShortcuts";

function ShortcutHandler() {
	useEditorShortcuts();
	return null;
}

export function EditorCanvas() {
	return (
		<Editor resolver={resolver}>
			<ShortcutHandler />
			<Frame>
				<Element
					is={UContainer}
					canvas={true}
					className="min-h-screen max-w-none mx-0 px-0 py-0 border-0 bg-transparent"
				>
					<UText text="" />
				</Element>
			</Frame>
		</Editor>
	);
}
