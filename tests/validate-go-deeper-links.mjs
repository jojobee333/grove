import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Test: Verify all "Go deeper" links in lesson markdown reference existing source files
 */
export function testGoDeeperlinkIntegrity() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Find all lesson files
  const curriculumDir = path.join(__dirname, '../curriculum/security-foundations/lessons');
  const lessonFiles = fs.readdirSync(curriculumDir).filter(f => f.endsWith('.md'));

  lessonFiles.forEach(file => {
    const filePath = path.join(curriculumDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Normalize line endings to \n
    content = content.replace(/\r\n/g, '\n');

    // Extract all "Go deeper" section links
    const goDeeperlinkPattern = /## Go deeper\n([\s\S]*?)(?:\n---|\n\*←|$)/;
    const match = content.match(goDeeperlinkPattern);

    if (!match) {
      results.warnings.push(`${file}: No "Go deeper" section found`);
      return;
    }

    const goDeeplerSection = match[1];

    // Extract all markdown links [text](path)
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;

    while ((linkMatch = linkPattern.exec(goDeeplerSection)) !== null) {
      const linkText = linkMatch[1];
      const linkPath = linkMatch[2];

      // Skip external links (http/https)
      if (linkPath.startsWith('http')) {
        results.passed.push(`${file}: External link "${linkText}" (${linkPath})`);
        continue;
      }

      // Check if it's a cross-lesson link (internal to Grove)
      if (linkPath.startsWith('./') || linkPath.startsWith('../')) {
        const isVaultLink = linkPath.includes('/vault/');
        const resolvedPath = path.resolve(path.dirname(filePath), linkPath);

        if (isVaultLink) {
          results.warnings.push({
            file,
            link: linkText,
            path: linkPath,
            issue: 'Cross-repository link to vault (won\'t work in bundled app)',
            info: 'Vault links should be converted to documentation URLs or stripped from bundle'
          });
        } else if (fs.existsSync(resolvedPath)) {
          results.passed.push(`${file}: Internal link "${linkText}" ✓`);
        } else {
          results.failed.push({
            file,
            link: linkText,
            path: linkPath,
            resolvedPath,
            error: `File not found: ${resolvedPath}`
          });
        }
      }
    }
  });

  return results;
}

/**
 * Test: Verify all source files referenced in lessons have corresponding content files
 */
export function testSourceFileCompleteness() {
  const results = {
    passed: [],
    failed: [],
    orphaned: []
  };

  const lessonsDir = path.join(__dirname, '../curriculum/security-foundations/lessons');
  const sourcesDir = path.join(__dirname, '../../vault/research/security-foundations/01-sources/web');

  // Extract all S### references from lessons
  const sourceReferences = new Set();
  const lessonFiles = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md'));

  lessonFiles.forEach(file => {
    const content = fs.readFileSync(path.join(lessonsDir, file), 'utf-8');
    const matches = content.match(/\bS\d{3}\b/g);
    if (matches) {
      matches.forEach(s => sourceReferences.add(s));
    }
  });

  // Check if referenced sources exist
  sourceReferences.forEach(source => {
    const sourceFiles = fs.readdirSync(sourcesDir).filter(f => f.startsWith(source));
    if (sourceFiles.length > 0) {
      results.passed.push(`${source} found (${sourceFiles.length} file(s))`);
    } else {
      results.failed.push({
        source,
        error: `Referenced but not found in sources directory`
      });
    }
  });

  // Check for orphaned source files (not referenced in any lesson)
  const sourceFiles = fs.readdirSync(sourcesDir);
  sourceFiles.forEach(file => {
    const match = file.match(/^(S\d{3})/);
    if (match) {
      const source = match[1];
      if (!sourceReferences.has(source)) {
        results.orphaned.push(`${source}: Not referenced in any lesson`);
      }
    }
  });

  return results;
}

/**
 * Main test runner
 */
export default function runTests() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Go Deeper Link Integrity Tests            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Test 1: Link validity
  console.log('Test 1: Verifying "Go deeper" links...\n');
  const linkTest = testGoDeeperlinkIntegrity();

  console.log(`✓ Valid links: ${linkTest.passed.length}`);
  if (linkTest.failed.length > 0) {
    console.log(`✗ Broken links: ${linkTest.failed.length}`);
    linkTest.failed.forEach(f => {
      console.log(`  └─ ${f.file}: [${f.link}]`);
      console.log(`     Expected: ${f.path}`);
      console.log(`     Error: ${f.error}`);
    });
  }
  if (linkTest.warnings.length > 0) {
    const stringWarnings = linkTest.warnings.filter(w => typeof w === 'string');
    const objectWarnings = linkTest.warnings.filter(w => typeof w === 'object');
    if (stringWarnings.length > 0) {
      console.log(`⚠ Warnings: ${stringWarnings.length}`);
      stringWarnings.forEach(w => console.log(`  └─ ${w}`));
    }
    if (objectWarnings.length > 0) {
      console.log(`⚠ Cross-repository vault links: ${objectWarnings.length}`);
      objectWarnings.slice(0, 5).forEach(w => {
        console.log(`  └─ ${w.file}: [${w.link}]`);
        console.log(`     Issue: ${w.issue}`);
      });
      if (objectWarnings.length > 5) {
        console.log(`  ... and ${objectWarnings.length - 5} more`);
      }
    }
  }

  // Test 2: Source file completeness
  console.log(`\nTest 2: Verifying source file references...\n`);
  const sourceTest = testSourceFileCompleteness();

  console.log(`✓ Referenced sources found: ${sourceTest.passed.length}`);
  if (sourceTest.failed.length > 0) {
    console.log(`✗ Missing sources: ${sourceTest.failed.length}`);
    sourceTest.failed.forEach(f => {
      console.log(`  └─ ${f.source}: ${f.error}`);
    });
  }
  if (sourceTest.orphaned.length > 0) {
    console.log(`⚠ Orphaned sources: ${sourceTest.orphaned.length}`);
    sourceTest.orphaned.forEach(o => console.log(`  └─ ${o}`));
  }

  // Summary
  const totalFailed = linkTest.failed.length + sourceTest.failed.length;
  const vaultWarnings = linkTest.warnings.filter(w => typeof w === 'object' && w.issue).length;

  console.log(`\n⚠️  Cross-repo vault links: ${vaultWarnings}`);
  if (vaultWarnings > 0) {
    console.log('  These links work in source but won\'t resolve in the bundled app.');
    console.log('  Consider: converting to external URLs or removing from bundle.');
  }

  console.log(`\n${totalFailed === 0 ? '✓ All tests passed!' : `✗ ${totalFailed} test(s) failed`}\n`);

  return totalFailed === 0;
}

// Run if invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}
