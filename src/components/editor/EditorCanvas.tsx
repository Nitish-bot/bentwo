"use client";

import { Editor, Element, Frame } from "@craftjs/core";
import { UText } from "@/components/user/text";
import { resolver } from "@/lib/resolver";

export function EditorCanvas() {
	return (
		<Editor resolver={resolver}>
			<Frame>
				<Element is="div" canvas={true} className="min-h-screen">
					<UText text="Start typing or press '/' for commands..." />
				</Element>
			</Frame>
		</Editor>
	);
}
