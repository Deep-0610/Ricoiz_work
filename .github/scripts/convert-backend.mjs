import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";

const root = process.cwd();
const sourceRoot = path.join(root, "convex");
const converted = [];
const removed = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (/\.d\.ts$/i.test(entry.name) || /\.ts\.bak$/i.test(entry.name)) {
      await unlink(fullPath);
      removed.push(path.relative(root, fullPath));
      continue;
    }

    if (!/\.tsx?$/i.test(entry.name)) continue;

    const source = await readFile(fullPath, "utf8");
    const result = await transform(source, {
      loader: entry.name.endsWith(".tsx") ? "tsx" : "ts",
      format: "esm",
      target: "es2022",
      sourcefile: fullPath,
      jsx: "automatic"
    });
    const outputPath = fullPath.replace(/\.tsx$/i, ".jsx").replace(/\.ts$/i, ".js");
    await writeFile(outputPath, result.code, "utf8");
    await unlink(fullPath);
    converted.push(path.relative(root, outputPath));
    removed.push(path.relative(root, fullPath));
  }
}

await walk(sourceRoot);

for (const file of converted) console.log("Converted:", file);
for (const file of removed) console.log("Removed:", file);
console.log(`Converted ${converted.length} files and removed ${removed.length} old source/declaration files.`);
