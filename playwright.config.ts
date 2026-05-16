import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 15_000,
  use: {
    // Browser is configured per-fixture (launchPersistentContext for extensions)
  },
});
