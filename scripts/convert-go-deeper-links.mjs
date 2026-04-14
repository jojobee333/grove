import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load source mappings
const sourcesPath = path.join(__dirname, '../curriculum/security-foundations/sources.json');
const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
const sources = sourcesData.sources;

// Function to convert vault links to external URLs
function convertVaultLinksToExternal(content) {
  // Pattern to match vault links: [Title](../../../../../vault/...)
  const vaultLinkPattern = /\[([^\]]+)\]\(\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/vault\/[^)]*\/([^/)]+)\.md\)/g;

  return content.replace(vaultLinkPattern, (match, title, sourceId) => {
    // Extract the source ID (e.g., "S005" from "S005-rfc1034-dns")
    const sourceParts = sourceId.split('-');
    const sId = sourceParts[0]; // e.g., "S005"

    if (sources[sId]) {
      const source = sources[sId];
      return `[${title}](${source.url})`;
    } else {
      console.warn(`  ⚠️  Unknown source: ${sId} in "${title}"`);
      return match; // Return original if not found
    }
  });
}

// Main conversion
export function convertAllLessons() {
  const lessonsDir = path.join(__dirname, '../curriculum/security-foundations/lessons');
  const lessonFiles = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md'));

  let convertedCount = 0;
  let linkCount = 0;

  console.log('\n🔄 Converting "Go deeper" links to external URLs...\n');

  lessonFiles.forEach(file => {
    const filePath = path.join(lessonsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Count vault links before conversion
    const vaultLinkPattern = /\[([^\]]+)\]\(\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/vault\/[^)]*\/([^/)]+)\.md\)/g;
    let beforeMatch;
    let linksInFile = 0;
    while ((beforeMatch = vaultLinkPattern.exec(content)) !== null) {
      linksInFile++;
    }

    if (linksInFile > 0) {
      const converted = convertVaultLinksToExternal(content);

      if (converted !== content) {
        fs.writeFileSync(filePath, converted, 'utf-8');
        convertedCount++;
        linkCount += linksInFile;
        console.log(`✓ ${file}: ${linksInFile} links converted`);
      }
    }
  });

  console.log(`\n✅ Conversion complete!`);
  console.log(`  • ${convertedCount} lesson files updated`);
  console.log(`  • ${linkCount} links converted to external URLs\n`);

  return { convertedCount, linkCount };
}

// Run if invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  convertAllLessons();
}

export default convertAllLessons;
