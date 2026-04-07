const path = require("path");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const { createProxyMiddleware } = require("http-proxy-middleware");

const resolve = (query) => path.resolve(__dirname, query);

/** @returns {import('@docusaurus/types').Plugin<any>} */
module.exports = () => ({
    configureWebpack: (config, isServer) => {
        return {
            plugins: [
                ...(isServer
                    ? []
                    : [
                          new ForkTsCheckerWebpackPlugin({
                              typescript: { configFile: resolve("../src/tsconfig.json") },
                          }),
                      ]),
            ],
            devServer: {
                setupMiddlewares: (middlewares, devServer) => {
                    // Proxy API requests before Docusaurus historyApiFallback kicks in
                    devServer.app.use(
                        "/moddota.github.io/api",
                        createProxyMiddleware({
                            target: "http://localhost:3001",
                            changeOrigin: true,
                        }),
                    );
                    return middlewares;
                },
            },
        };
    },
});
