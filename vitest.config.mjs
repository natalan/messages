import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    // Suppress verbose output in CI, show warnings in development
    logLevel: process.env.CI ? "error" : "warn",
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
  // Note on test output messages:
  // - [vpw:debug] messages are informational and expected. They show compatibility flags
  //   being enabled by @cloudflare/vitest-pool-workers for the test runtime.
  // - Punycode deprecation warnings (if any) are suppressed via NODE_OPTIONS in package.json.
  //   These may occasionally appear from dependencies and are harmless.
});
