import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

const navbar = <Navbar logo={<b>Nextra</b>} />;
const footer = <Footer>MIT {new Date().getFullYear()} © Nextra.</Footer>;

export default async function RootLayout({ children }) {
	return (
		<html
			// Not required, but good for SEO
			lang="en"
			// Required to be set
			dir="ltr"
			// Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
			suppressHydrationWarning
		>
			<Head>
				{/* ... Your additional head options */}
				{/* Your additional tags should be passed as `children` of `<Head>` element */}
			</Head>
			<body>
				<Layout
					navbar={navbar}
					pageMap={await getPageMap()}
					docsRepositoryBase="https://github.com/shuding/nextra/tree/main/docs"
					footer={footer}
					search={false}
					editLink={false}
					feedback={{ content: null }}
				>
					{children}
				</Layout>
			</body>
		</html>
	);
}
