import Link from "next/link";

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
		</main>
	);
}
