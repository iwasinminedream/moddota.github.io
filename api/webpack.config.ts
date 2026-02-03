import { TransformOptions } from "@babel/core";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import * as path from "path";
import { Configuration } from "webpack";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
// Required to augment `Configuration`
import type {} from "webpack-dev-server";

const resolve = (name: string) => path.resolve(__dirname, name);
const tsconfigPath = resolve("src/tsconfig.json");

export default (env: Record<string, any> = {}, argv: Configuration): Configuration => {
  const isProduction = argv.mode === "production";

  const babelConfig: TransformOptions = {
    plugins: [
      ["@babel/plugin-proposal-class-properties", { loose: true }],
      ["babel-plugin-styled-components", { ssr: false }],
    ],
    presets: [
      "@babel/preset-typescript",
      "@babel/preset-react",
      [
        "@babel/preset-env",
        {
          loose: true,
          targets: ["last 1 chrome version", "last 1 firefox version"],
          include: ["proposal-nullish-coalescing-operator", "proposal-optional-chaining"],
        },
      ],
    ],
  };

  return {
    output: {
      publicPath: isProduction ? "/moddota.github.io/" : "/",
      filename: isProduction ? "[name].[contenthash].js" : undefined,
      path: path.resolve(__dirname, "dist"),
    },

    devtool: isProduction ? "nosources-source-map" : "eval-source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".json"],
      alias: {
        "~utils": resolve("src/utils"),
        "~components": resolve("src/components"),
        // In development, use local dota-data for hot reloading
        // In production, use npm package from node_modules
        ...(isProduction ? {} : {
          "@moddota/dota-data/files": path.resolve(__dirname, "../../dota-data/files"),
          "@moddota/dota-data/lib": path.resolve(__dirname, "../../dota-data/lib"),
          "@moddota/dota-data": path.resolve(__dirname, "../../dota-data"),
        }),
      },
    },
    optimization: {
      moduleIds: isProduction ? "deterministic" : undefined,
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          include: resolve("src"),
          use: [{ loader: "babel-loader", options: babelConfig }],
        },
        {
          test: /\.svg$/,
          use: [
            { loader: "babel-loader", options: babelConfig },
            { loader: "@svgr/webpack", options: { babel: false, dimensions: false } },
          ],
        },
        {
          test: /\.png$/,
          use: [{ loader: "file-loader" }],
        },
      ],
    },

    plugins: [
      new CaseSensitivePathsPlugin(),
      new ForkTsCheckerWebpackPlugin({
        typescript: { configFile: tsconfigPath },
      }),

      new CleanWebpackPlugin(),
      new CopyWebpackPlugin({ patterns: [resolve("public")] }),
      new HtmlWebpackPlugin({
        template: resolve("src/index.html"),
        minify: { minifyCSS: true, minifyJS: true, removeComments: true, collapseWhitespace: true },
      }),

      ...(env.analyze ? [new BundleAnalyzerPlugin()] : []),
    ],

    devServer: {
      port: 3000,
      hot: true,
      historyApiFallback: true,
      static: {
        // Serve changelog files from dota-data
        directory: path.resolve(__dirname, '../../dota-data/files'),
        publicPath: '/changelog-data',
        watch: true,
      },
      watchFiles: {
        // Watch local dota-data files for changes during development
        paths: [path.resolve(__dirname, '../../dota-data/files/**/*.json'), path.resolve(__dirname, '../../dota-data/lib/**/*.js')],
        options: {
          usePolling: true,
          interval: 1000,
        },
      },
    },

    watchOptions: {
      ignored: /node_modules/,
    },
  };
};
