/// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';

/**
 * Colours, radii and opacities come from `@/constants/theme` (`Colors`, `Radius`, `Opacity`); a
 * literal in a view drifts from the palette and skips dark mode.
 */
const ROOT = path.join(__dirname, '..');
const SCANNED_DIRS = ['src/app', 'src/components', 'src/hooks'];
const LITERALS = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\b(?:rgba?|hsla?|oklch)\(/,
  // borderRadius and per-corner radii, as a number or borrowed from Spacing.
  /\b\w*[Rr]adius\s*:\s*(?:[-.\d]|Spacing\.)/,
  // opacity and shadowOpacity, including a number inside a condition.
  /\b\w*[Oo]pacity\s*:[^,;}]*?(?<![\w.])\d/,
];

const SKIPPED = new Set([
  // The token source itself.
  'src/constants/theme.ts',
  // Splash icon: its gradient, radius and fade keyframes come from the Expo template and are out of
  // scope for the design tokens (my-lists-ui). The .web.tsx file is the same splash on web.
  'src/components/animated-icon.tsx',
  'src/components/animated-icon.web.tsx',
  // Web tab bar: its pill shapes use Spacing as radius; kept as is (user decision, my-lists-ui review F3).
  'src/components/app-tabs.web.tsx',
]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(relative);
    }
    return /\.tsx?$/.test(entry.name) ? [relative] : [];
  });
}

describe('design tokens', () => {
  test('views use theme tokens, not colour, radius or opacity literals', () => {
    const files = SCANNED_DIRS.flatMap(sourceFiles).filter((file) => !SKIPPED.has(file));
    const hits = files.flatMap((file) =>
      fs
        .readFileSync(path.join(ROOT, file), 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          LITERALS.some((pattern) => pattern.test(line)) ? [`${file}:${index + 1}`] : []
        )
    );

    expect(files.length).toBeGreaterThan(0);
    expect(hits).toEqual([]);
  });
});
