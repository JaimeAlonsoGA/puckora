import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const INPUT_FILE_PATH = resolve('packages/types/src/database.types.ts');
const OUTPUT_FILE_PATH = resolve('packages/types/src/index.ts');
const IMPORT_PATH = './database.types'; // import relativo desde packages/types/src/index.ts

function singularize(name: string): string {
  const exceptions = [''];
  if (exceptions.includes(name)) {
    return name;
  }

  if (name.endsWith('ies')) {
    return name.slice(0, -3) + 'y';
  }

  if (name.endsWith('s')) {
    return name.slice(0, -1);
  }

  return name;
}

function snakeToPascal(snake: string): string {
  return snake
    .split('_')
    .map((word) => {
      const singularWord = singularize(word);
      return singularWord.charAt(0).toUpperCase() + singularWord.slice(1);
    })
    .join('');
}

function readFileWithEncodingDetection(path: string): { content: string; encoding: string; preview: string } {
  const buf = readFileSync(path);
  // read first bytes
  const b0 = buf[0], b1 = buf[1], b2 = buf[2];
  let content: string;
  let encoding = 'unknown';

  // UTF-8 BOM EF BB BF
  if (b0 === 0xEF && b1 === 0xBB && b2 === 0xBF) {
    content = buf.toString('utf8').replace(/^\uFEFF/, '');
    encoding = 'utf8-bom';
  }
  // UTF-16 LE BOM FF FE
  else if (b0 === 0xFF && b1 === 0xFE) {
    content = buf.toString('utf16le');
    encoding = 'utf16-le';
  }
  // UTF-16 BE BOM FE FF
  else if (b0 === 0xFE && b1 === 0xFF) {
    // swap16 to turn BE into LE for Node's utf16le decoding
    const copy = Buffer.from(buf);
    copy.swap16();
    content = copy.toString('utf16le');
    encoding = 'utf16-be';
  } else {
    // try utf8 first (most common)
    content = buf.toString('utf8');
    // if it looks like replacement characters at start, try utf16le as fallback
    if (content.charCodeAt(0) === 0xfffd) {
      try {
        content = buf.toString('utf16le');
        encoding = 'utf16-le-fallback';
      } catch {
        encoding = 'utf8-fallback';
      }
    } else {
      // remove possible BOM char if present
      content = content.replace(/^\uFEFF/, '');
      encoding = 'utf8';
    }
  }

  const preview = content.slice(0, 500).replace(/\n/g, '\\n');
  return { content, encoding, preview };
}

function generateTypes(): void {
  let content: string;
  try {
    const result = readFileWithEncodingDetection(INPUT_FILE_PATH);
    content = result.content;
    console.log(`File encoding detected: ${result.encoding}`);
    console.log(`File content preview: ${result.preview}`);
  } catch (err) {
    console.error(`❌ Error: Input file not found or cannot be read at '${INPUT_FILE_PATH}'`);
    console.error(String(err));
    return;
  }

  // REGEX robusto que acepta Views, Functions, Enums, CompositeTypes o el final del archivo
  const tablesBlockMatch = content.match(
    /Tables\s*:\s*{([\s\S]*?)}\s*(?:,?\s*(Views|Functions|Enums|CompositeTypes)\s*:|$)/
  );

  if (!tablesBlockMatch) {
    console.error(`❌ Error: Could not find the 'Tables' definition block in the input file.`);
    console.error('Please ensure the file is a valid Supabase types file that includes a Views block (or one of Functions/Enums/CompositeTypes).');
    return;
  }

  const tablesBlock = tablesBlockMatch[1];
  const tableNames = [...tablesBlock.matchAll(/^\s*([a-zA-Z0-9_]+)\s*:\s*{\s*Row:/gm)].map((m) => m[1]);

  // Extract enums (robusto)
  const enumsBlockMatch = content.match(/Enums\s*:\s*{([\s\S]*?)}\s*(?:,?\s*(CompositeTypes|$)\s*:|$)/);
  const enumNames: string[] = [];
  if (enumsBlockMatch) {
    const enumsBlock = enumsBlockMatch[1];
    const enumMatches = [...enumsBlock.matchAll(/^\s*([a-zA-Z0-9_]+)\s*:\s*(?:string|["'`])/gm)];
    enumMatches.forEach((match) => enumNames.push(match[1]));
  }

  if (tableNames.length === 0 && enumNames.length === 0) {
    console.warn('⚠️ Warning: No tables or enums found in the input file.');
    // still continue to generate a minimal index if you want — here we stop
    return;
  }

  const outputLines = [
    `import type { Database } from '${IMPORT_PATH}'\n`,
    '// Generic type helpers',
    'type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]',
    'type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]',
    'type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]',
    'type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]\n',
  ];

  if (tableNames.length > 0) {
    outputLines.push('// Tables');
    tableNames.sort().forEach((name) => {
      const pascal = snakeToPascal(name);
      outputLines.push(`export type ${pascal} = Tables<"${name}">`);
      outputLines.push(`export type ${pascal}Insert = TablesInsert<"${name}">`);
      outputLines.push(`export type ${pascal}Update = TablesUpdate<"${name}">`);
      outputLines.push('');
    });
  }

  if (enumNames.length > 0) {
    outputLines.push('// Enums');
    enumNames.sort().forEach((name) => {
      const pascal = snakeToPascal(name);
      outputLines.push(`export type ${pascal} = Enums<"${name}">`);
    });
    outputLines.push('');
  }

  writeFileSync(OUTPUT_FILE_PATH, outputLines.join('\n'), 'utf-8');

  const tableCount = tableNames.length;
  const enumCount = enumNames.length;
  const summary: string[] = [];
  if (tableCount > 0) summary.push(`${tableCount} table type${tableCount !== 1 ? 's' : ''}`);
  if (enumCount > 0) summary.push(`${enumCount} enum type${enumCount !== 1 ? 's' : ''}`);

  console.log(`✅ Successfully generated ${summary.join(' and ')} in '${OUTPUT_FILE_PATH}'!`);
}

generateTypes();
