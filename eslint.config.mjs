// eslint.config.mjs
import js from "@eslint/js";

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
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        // ...envGlobals.node,
        // ...envGlobals.browser,
        // ...envGlobals.es6,
        // ...envGlobals.mocha,
      },
    },

    rules: {
      "no-const-assign": "warn",
      "no-this-before-super": "warn",
      "no-undef": "warn",
      "no-unreachable": "warn",
      "no-unused-vars": "warn",
      "constructor-super": "warn",
      "valid-typeof": "warn",
    },
  },
  js.configs.recommended,

];
