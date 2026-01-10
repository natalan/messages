// ESLint 9+ flat config format
export default [
  {
    files: ["src/**/*.js", "src/**/*.test.js", "src/**/__tests__/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Cloudflare Workers globals
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        console: "readonly",
        // Worker context
        env: "readonly",
        ctx: "readonly",
        // Vitest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
    rules: {
      // Disable indent rule - Prettier handles formatting
      indent: "off",
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["log", "warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
    },
  },
  {
    // Special config for Google Apps Script files
    files: ["src/scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        // Google Apps Script globals
        GmailApp: "readonly",
        UrlFetchApp: "readonly",
        Logger: "readonly",
        SpreadsheetApp: "readonly",
        DriveApp: "readonly",
        Utilities: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^run$" }],
      "no-undef": "off",
    },
  },
];
