import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UButton } from "@/components/user/button";
import { UCard } from "@/components/user/card";
import { UContainer } from "@/components/user/container";
import { UText } from "@/components/user/text";

export default function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
			<h1 className="text-4xl font-bold">bentwo</h1>
			<p className="text-muted-foreground">
				Personal website builder for creatives
			</p>
			<Link
				href="/editor"
				className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
			>
				Open Editor
			</Link>

			<div className="mt-8 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Component Smoke Test</h2>
				<Button>Click me </Button>
				<UText />
				<UCard title="Test Card" description="This is a test card component" />
				<UButton>Test Button</UButton>
				<UContainer>
					<p>Container content</p>
				</UContainer>
			</div>
		</main>
	);
}
