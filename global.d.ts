/// <reference types="next" />

// Global type declarations for CSS imports
declare module "*.css" {
	const css: string;
	export default css;
}
