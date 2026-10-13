// Runs after `next build` (npm "postbuild"): writes out/.htaccess from
// htaccess.template, filling in the API URL so no environment URL lives in the repo.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import nextEnv from '@next/env';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
nextEnv.loadEnvConfig(root);

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
if (!/^https?:\/\/[^\s"']+$/.test(apiUrl)) {
    console.error('write-htaccess: NEXT_PUBLIC_API_URL falta o no es una URL válida (GitHub Secret QA_API_URL / PROD_API_URL).');
    process.exit(1);
}

const outDir = join(root, 'out');
if (!existsSync(outDir)) {
    console.error('write-htaccess: no existe out/ — ¿next.config tiene output: "export"?');
    process.exit(1);
}

const template = readFileSync(join(root, 'htaccess.template'), 'utf8');
writeFileSync(join(outDir, '.htaccess'), template.replaceAll('__API_URL__', apiUrl));
console.log(`write-htaccess: out/.htaccess generado (API: ${apiUrl})`);
