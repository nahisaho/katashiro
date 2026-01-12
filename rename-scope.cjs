const fs = require('fs');
const path = require('path');

const packages = ['core', 'collector', 'analyzer', 'generator', 'knowledge', 'feedback', 'mcp-server'];

packages.forEach(pkg => {
  const pkgPath = path.join(__dirname, 'packages', pkg, 'package.json');
  const content = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  // Change @katashiro to @nahisaho
  content.name = content.name.replace('@katashiro/', '@nahisaho/katashiro-');
  
  // Update dependencies
  if (content.dependencies) {
    Object.keys(content.dependencies).forEach(dep => {
      if (dep.startsWith('@katashiro/')) {
        const newDep = dep.replace('@katashiro/', '@nahisaho/katashiro-');
        content.dependencies[newDep] = content.dependencies[dep];
        delete content.dependencies[dep];
      }
    });
  }
  
  fs.writeFileSync(pkgPath, JSON.stringify(content, null, 2) + '\n');
  console.log(`Updated: ${pkg} -> ${content.name}`);
});

console.log('\nDone!');
