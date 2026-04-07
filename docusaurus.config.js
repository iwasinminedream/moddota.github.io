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
                {
                    position: "left",
                    type: "html",
                    value: '<a class="navbar__link navbar__link--api" href="/moddota.github.io/api/">API<svg width="12" height="12" aria-hidden="true" viewBox="0 0 24 24" class="iconExternalLink"><path fill="currentColor" d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"></path></svg></a>',
                },
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
