import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default [
    {
        external: ["webextension-polyfill"],
        input: "src/index.ts",
        output: {
            format: "cjs",
            file: "lib/index.cjs.js",
            sourcemap: true,
        },
        plugins: [typescript(), nodeResolve()]
    },
    {
        external: ["webextension-polyfill", "deflib"],
        input: "src/index.ts",
        output: {
            format: "esm",
            file: "lib/index.esm.js",
            sourcemap: true,
        },
        plugins: [typescript()]
    },
    {
        input: "extension-src/popup.ts",
        output: {
            name: "ExtensionPopup",
            format: "iife",
            file: "extension/dist/popup.js",
            sourcemap: true,
        },
        plugins: [typescript(), nodeResolve()]
    },
    {
        input: "extension-src/bg.ts",
        output: {
            name: "ExtensionBG",
            format: "iife",
            file: "extension/dist/bg.js",
            sourcemap: true,
        },
        plugins: [typescript(), nodeResolve()]
    }
]