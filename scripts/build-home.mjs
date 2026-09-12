import { build, context } from 'esbuild';

export const options = {
  entryPoints: { badge: 'js/home/badge.js', pages: 'js/home/pages.js' },
  outdir: 'js/home/generated',
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  target: ['es2022'],
  legalComments: 'linked',
  logLevel: 'info',
};

if (process.argv[1].endsWith('build-home.mjs')) await build(options);

export async function watch() {
  const builder = await context(options);
  await builder.watch();
  return builder;
}
