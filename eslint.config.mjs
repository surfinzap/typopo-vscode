// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

// Define globals for the environments you want to support
const envGlobals = {
  node: {
    require: "readonly",
    module: "readonly",
    process: "readonly",
    __dirname: "readonly",
    __filename: "readonly",
    exports: "readonly",
    console: "readonly",
    global: "readonly",
    setTimeout: "readonly",
    setInterval: "readonly",
    clearTimeout: "readonly",
    clearInterval: "readonly",
    Buffer: "readonly",
  },
  browser: {
    window: "readonly",
    document: "readonly",
    navigator: "readonly",
    console: "readonly",
    alert: "readonly",
    fetch: "readonly",
    location: "readonly",
    history: "readonly",
    localStorage: "readonly",
    sessionStorage: "readonly",
    setTimeout: "readonly",
    clearTimeout: "readonly",
    setInterval: "readonly",
    clearInterval: "readonly",
  },
  es6: {
    Promise: "readonly",
    Symbol: "readonly",
    Map: "readonly",
    Set: "readonly",
    WeakMap: "readonly",
    WeakSet: "readonly",
    Proxy: "readonly",
    Reflect: "readonly",
    globalThis: "readonly",
  },
  mocha: {
    describe: "readonly",
    it: "readonly",
    before: "readonly",
    after: "readonly",
    beforeEach: "readonly",
    afterEach: "readonly",
    context: "readonly",
  },
};

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        ...envGlobals.node,
        ...envGlobals.es6,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-undef": "off", // TypeScript handles this
    },
  },
];
