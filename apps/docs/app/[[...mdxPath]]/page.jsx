import { generateStaticParamsFor, importPage } from "nextra/pages";
import { useMDXComponents as getMDXComponents } from "../../mdx-components";
import { notFound } from "next/navigation";

export const generateStaticParams = generateStaticParamsFor("mdxPath");

// Helper function to check if the path should be handled by this catch-all route
function shouldHandlePath(mdxPath) {
	// Return false for undefined or empty paths
	if (!mdxPath || mdxPath.length === 0) {
		return true; // Allow root path
	}

	// Filter out common static files and Next.js internal paths
	const firstSegment = mdxPath[0];
	const staticExtensions = [
		".ico",
		".png",
		".jpg",
		".jpeg",
		".svg",
		".gif",
		".webp",
		".js",
		".css",
		".woff",
		".woff2",
		".ttf",
		".eot",
	];

	// Check if it's a static file request
	if (
		staticExtensions.some(
			(ext) =>
				firstSegment.endsWith(ext) ||
				(mdxPath[mdxPath.length - 1] && mdxPath[mdxPath.length - 1].endsWith(ext)),
		)
	) {
		return false;
	}

	// Filter out Next.js internal paths
	const internalPaths = ["_next", "api", "mockServiceWorker.js"];
	if (internalPaths.includes(firstSegment)) {
		return false;
	}

	return true;
}

export async function generateMetadata(props) {
	const params = await props.params;

	if (!shouldHandlePath(params.mdxPath)) {
		return {};
	}

	try {
		const { metadata } = await importPage(params.mdxPath);
		return metadata;
	} catch {
		// Return empty metadata if page doesn't exist
		return {};
	}
}

const Wrapper = getMDXComponents().wrapper;

export default async function Page(props) {
	const params = await props.params;

	if (!shouldHandlePath(params.mdxPath)) {
		notFound();
	}

	try {
		const {
			default: MDXContent,
			toc,
			metadata,
			sourceCode,
		} = await importPage(params.mdxPath);
		return (
			<Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
				<MDXContent {...props} params={params} />
			</Wrapper>
		);
	} catch {
		// If the page doesn't exist, return 404
		notFound();
	}
}
