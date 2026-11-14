import { defineConfig } from "vitest/config";

// Security-rule tests run against the Firestore emulator (Java 11+ and firebase-tools required):
//   npx firebase-tools emulators:exec --only firestore "npx vitest run --config vitest.rules.config.mts"
export default defineConfig({
  test: { include: ["tests/rules/**/*.test.ts"], environment: "node", testTimeout: 30000, fileParallelism: false },
});
