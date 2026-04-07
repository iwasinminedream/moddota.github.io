/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
    title: "ModDota",
    url: "https://iwasinminedream.github.io",
    baseUrl: "/moddota.github.io/",
    favicon: "images/favicon.ico",
    onBrokenLinks: "throw",
    themeConfig: {
        navbar: {
            title: "ModDota",
            logo: {
                alt: "ModDota",
                src: "images/logo.svg",
            },
            items: [
                { position: "left", label: "API", href: "pathname:///moddota.github.io/api/", target: "_self" },
                { position: "right", label: "New Article", to: "/new-article" },
            ],
        },
        prism: {
            additionalLanguages: ["lua"],
            theme: require("prism-react-renderer/themes/github"),
            darkTheme: require("prism-react-renderer/themes/dracula"),
        },
        algolia: {
            appId: "53WE0HHYGT",
            apiKey: "ce612349c2e1e35842e9630128e92dc2",
            indexName: "moddota",
            contextualSearch: false,
        },
    },
    presets: [
        [
            "@docusaurus/preset-classic",
            {
                docs: {
                    path: "_articles",
                    routeBasePath: "/",
                    sidebarPath: require.resolve("./sidebars.json"),
                    editUrl: "https://github.com/iwasinminedream/moddota.github.io/edit/source/",
                    remarkPlugins: [
                        require("./docusaurus/remark-component-provider"),
                        require("./docusaurus/remark-remove"),
                    ],
                },
                theme: {
                    customCss: require.resolve("./src/custom.scss"),
                },
            },
        ],
    ],
    plugins: ["docusaurus-plugin-sass", require.resolve("./docusaurus/plugin")],
};
