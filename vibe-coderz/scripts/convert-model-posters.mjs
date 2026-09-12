import sharp from 'sharp';
import { readdir, unlink } from 'node:fs/promises';
const directory = new URL('../public/models/studio/', import.meta.url);
for (const file of await readdir(directory)) {
  if (!file.endsWith('.png')) continue;
  const source = new URL(file, directory);
  await sharp(source.pathname).webp({ quality: 84, alphaQuality: 90 }).toFile(new URL(file.replace('.png', '.webp'), directory).pathname);
  await unlink(source);
}
