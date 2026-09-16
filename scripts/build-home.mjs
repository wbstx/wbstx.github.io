import { build, context } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import { createPrismScene, prismPoster } from '../js/home/halftone.js';

export const options = {
  entryPoints: { badge: 'js/home/badge.js', pages: 'js/home/pages.js', 'badge-loader': 'js/home/badge-loader.js' },
  outdir: 'js/home/generated',
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  target: ['es2022'],
  legalComments: 'linked',
  logLevel: 'info',
};

async function buildLoaderPoster() {
  await writeFile('images/home/halftone-prism.svg', prismPoster(createPrismScene()));
}

if (process.argv[1].endsWith('build-home.mjs')) {
  await buildLoaderPoster();
  await build(options);
}

export async function watch() {
  await buildLoaderPoster();
  const builder = await context(options);
  await builder.watch();
  return builder;
}
