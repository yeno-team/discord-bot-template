import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const loadableExtension = /\.(?:js|ts)$/u;
const ignoredFile = /(?:\.d\.ts|\.test\.[jt]s|\.spec\.[jt]s)$/u;

export async function findModuleFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findModuleFiles(fullPath);
      if (!loadableExtension.test(entry.name) || ignoredFile.test(entry.name)) return [];
      if (entry.name === 'index.ts' || entry.name === 'index.js') return [];
      return [fullPath];
    }),
  );

  return files.flat().sort();
}

export async function loadDefaultExport<T>(file: string): Promise<T> {
  const module = (await import(pathToFileURL(file).href)) as { default?: T };
  if (module.default === undefined) {
    throw new Error(`Module does not have a default export: ${file}`);
  }
  return module.default;
}
