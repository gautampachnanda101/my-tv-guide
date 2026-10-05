// Resolves the "@/..." import alias (see jsconfig.json) for `node --test`,
// which otherwise only understands relative and package imports.
const projectRoot = new URL("../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = new URL(specifier.slice(2), projectRoot).href;
    for (const candidate of [target, `${target}.js`, `${target}.jsx`, `${target}/index.js`]) {
      try {
        return await nextResolve(candidate, context);
      } catch {
        // try the next extension
      }
    }
  }
  return nextResolve(specifier, context);
}
