export default {
	logo: "My Project",
	project: {
		link: "https://github.com/shuding/nextra",
	},
	docsRepositoryBase: "https://github.com/shuding/nextra",
	footer: {
		text: `MIT ${new Date().getFullYear()} © Nextra.`,
	},
	navigation: true,
	darkMode: true,
	editLink: {
		text: "Edit this page on GitHub",
	},
	getNextSeoProps: () => ({
		titleTemplate: "%s – My Project",
	}),
};
