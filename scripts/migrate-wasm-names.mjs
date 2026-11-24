import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function migrateNames(input) {
  const hash = createHash('sha256').update(input).digest('hex');
  if (hash !== '70445fc746f539eee672f99c534b217f4d71c95cfd5422fbb9b7be7e40d4815f') {
    throw new Error('Expected the original pinned runtime binary; rebuild from Rust for other versions');
  }
  const output = Buffer.from(input);
  for (const [from, to] of [
    ['$runtimekit$setrealmfn', '$grove$setrealmfn     '],
    ['runtimekit.codec.packuri__', 'grove.codec.packuri__     '],
  ]) {
    const offset = output.indexOf(from);
    if (from.length !== to.length || offset < 0 || output.indexOf(from, offset + 1) !== -1) {
      throw new Error('Unexpected runtime data layout');
    }
    output.write(to, offset, 'ascii');
  }
  if (!WebAssembly.validate(output)) throw new Error('Invalid renamed runtime');
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , source, destination] = process.argv;
  if (!source || !destination) throw new Error('Provide source and destination paths');
  await writeFile(destination, migrateNames(await readFile(source)));
}
