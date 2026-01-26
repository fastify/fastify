const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const DOCS_DIR = path.join(__dirname, 'docs');
const TIMEOUT = 10000; // 10 seconds

// Track results
const results = {
  brokenInternal: [],
  brokenExternal: [],
  checkedFiles: 0,
  totalLinks: 0
};

// Get all markdown files recursively
function getMarkdownFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract links from markdown content
function extractLinks(content, filePath) {
  const links = [];
  
  // Match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const url = match[2];
    // Skip anchors without paths and mailto links
    if (!url.startsWith('#') && !url.startsWith('mailto:')) {
      links.push({
        text: match[1],
        url: url,
        line: content.substring(0, match.index).split('\n').length,
        file: filePath
      });
    }
  }
  
  return links;
}

// Check if internal link exists
function checkInternalLink(link, sourceFile) {
  const url = link.url.split('#')[0]; // Remove anchor
  if (!url) return true; // Just an anchor
  
  const sourcedir = path.dirname(sourceFile);
  const targetPath = path.resolve(sourcedir, url);
  
  if (!fs.existsSync(targetPath)) {
    return false;
  }
  
  return true;
}

// Check if external link is valid
function checkExternalLink(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      method: 'HEAD',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)'
      }
    };
    
    const req = protocol.request(url, options, (res) => {
      // Accept 2xx and 3xx status codes
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Main function
async function checkLinks() {
  console.log('🔍 Scanning for markdown files...\n');
  
  const files = getMarkdownFiles(DOCS_DIR);
  console.log(`Found ${files.length} markdown files\n`);
  
  // Collect all links
  const allLinks = [];
  
  for (const file of files) {
    results.checkedFiles++;
    const content = fs.readFileSync(file, 'utf-8');
    const links = extractLinks(content, file);
    allLinks.push(...links);
  }
  
  results.totalLinks = allLinks.length;
  console.log(`Found ${allLinks.length} total links\n`);
  
  // Separate internal and external links
  const internalLinks = allLinks.filter(link => 
    !link.url.startsWith('http://') && !link.url.startsWith('https://')
  );
  
  const externalLinks = allLinks.filter(link => 
    link.url.startsWith('http://') || link.url.startsWith('https://')
  );
  
  console.log(`📁 Checking ${internalLinks.length} internal links...`);
  
  // Check internal links
  for (const link of internalLinks) {
    if (!checkInternalLink(link, link.file)) {
      results.brokenInternal.push(link);
    }
  }
  
  console.log(`✅ Internal links checked: ${results.brokenInternal.length} broken\n`);
  
  console.log(`🌐 Checking ${externalLinks.length} external links (this may take a while)...`);
  
  // Check external links (with rate limiting)
  const batchSize = 5;
  for (let i = 0; i < externalLinks.length; i += batchSize) {
    const batch = externalLinks.slice(i, i + batchSize);
    const promises = batch.map(async (link) => {
      const isValid = await checkExternalLink(link.url);
      if (!isValid) {
        results.brokenExternal.push(link);
      }
    });
    
    await Promise.all(promises);
    process.stdout.write(`  Progress: ${Math.min(i + batchSize, externalLinks.length)}/${externalLinks.length}\r`);
  }
  
  console.log(`\n✅ External links checked: ${results.brokenExternal.length} broken\n`);
  
  // Print results
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('═══════════════════════════════════════════════════\n');
  
  if (results.brokenInternal.length === 0 && results.brokenExternal.length === 0) {
    console.log('✅ All links are valid!\n');
  } else {
    if (results.brokenInternal.length > 0) {
      console.log('❌ Broken Internal Links:\n');
      results.brokenInternal.forEach(link => {
        const relativePath = path.relative(__dirname, link.file);
        console.log(`  File: ${relativePath}:${link.line}`);
        console.log(`  Text: "${link.text}"`);
        console.log(`  Link: ${link.url}\n`);
      });
    }
    
    if (results.brokenExternal.length > 0) {
      console.log('❌ Broken External Links:\n');
      results.brokenExternal.forEach(link => {
        const relativePath = path.relative(__dirname, link.file);
        console.log(`  File: ${relativePath}:${link.line}`);
        console.log(`  Text: "${link.text}"`);
        console.log(`  Link: ${link.url}\n`);
      });
    }
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total files checked: ${results.checkedFiles}`);
  console.log(`Total links found: ${results.totalLinks}`);
  console.log(`Broken links: ${results.brokenInternal.length + results.brokenExternal.length}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  // Exit with error code if broken links found
  if (results.brokenInternal.length > 0 || results.brokenExternal.length > 0) {
    process.exit(1);
  }
}

checkLinks().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
