/**
 * Files made for sharing (the report PDF and the CSV), written to the
 * cache folder on the phone. They go only where the person sends them.
 */
import { Directory, File, Paths } from 'expo-file-system';

function exportDir(): Directory {
  const dir = new Directory(Paths.cache, 'export');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Writes text to a file in the export folder, and returns its URI. */
export function writeShareFile(name: string, text: string): string {
  const f = new File(exportDir(), name);
  if (f.exists) f.delete();
  f.create();
  f.write(text);
  return f.uri;
}

/** Moves a finished file (the printed PDF) into the export folder under a readable name. */
export function nameForShare(uri: string, name: string): string {
  const dest = new File(exportDir(), name);
  if (dest.exists) dest.delete();
  new File(uri).moveSync(dest);
  return dest.uri;
}
