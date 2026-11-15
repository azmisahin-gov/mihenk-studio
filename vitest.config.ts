import { defineConfig } from "vitest/config";

/**
 * Node yerleşik modülleri (`node:sqlite` dâhil) Vite tarafından çözülmemelidir;
 * aksi hâlde `node:` ön eki kaldırılarak aranır ve hata verir.
 */
const externalNodeBuiltins = {
  name: "external-node-builtins",
  enforce: "pre" as const,
  resolveId(source: string) {
    if (source.startsWith("node:")) {
      return { id: source, external: true };
    }
    return null;
  },
};

export default defineConfig({
  plugins: [externalNodeBuiltins],
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environmentMatchGlobs: [
      ["tests/e2e/**", "jsdom"],
      ["tests/unit/ui/**", "jsdom"],
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
  },
});
