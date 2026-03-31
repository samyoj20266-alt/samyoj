const fs = require('fs');
const path = require('path');

const dir = __dirname;
const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

// 1. Rename everything inside the HTM files
htmlFiles.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    // Replace href="index.html" with href="role-select.html"
    // Also catch href='index.html' or similar
    content = content.replace(/href=["']index\.html["']/g, 'href="role-select.html"');
    // Also catch window.location.href = "index.html"
    content = content.replace(/location\.href\s*=\s*["']index\.html["']/g, 'location.href = "role-select.html"');
    
    fs.writeFileSync(path.join(dir, file), content, 'utf8');
});

console.log('Updated links in all HTML files.');

// 2. Do the file renaming dance
if (fs.existsSync(path.join(dir, 'index.html')) && fs.existsSync(path.join(dir, 'landing.html'))) {
    fs.renameSync(path.join(dir, 'index.html'), path.join(dir, 'role-select.html'));
    fs.renameSync(path.join(dir, 'landing.html'), path.join(dir, 'index.html'));
    console.log('Renamed index.html -> role-select.html');
    console.log('Renamed landing.html -> index.html');
} else {
    console.log('Already renamed or missing files.');
}
