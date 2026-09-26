const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const dir = path.join('c:', 'Users', 'anzamuneebkhan', 'Desktop', 'Office_Offline_Work', 'POS_Software', 'frontend', 'app');
const files = walk(dir);

let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(
    /<div className="card" style={{ padding: 0, overflow: "hidden" }}>\s*<div className="table-wrapper">/g,
    '<div className="card card-table">\n            <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>'
  );
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    count++;
    console.log(`Updated: ${file}`);
  }
});
console.log(`Total files updated: ${count}`);
