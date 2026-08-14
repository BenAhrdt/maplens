const fs = require('fs');

const version = String(process.argv[2] || '').replace(/^v/, '');
const entries = JSON.parse(fs.readFileSync('CHANGELOG.json', 'utf8'));
const entry = entries.find(item => item.version === version);
if (!entry) {
  console.error(`Kein Changelog-Eintrag für Version ${version} gefunden.`);
  process.exit(1);
}

function section(language, note) {
  return [`## ${language}: ${note.title}`, '', ...note.items.map(item => `- ${item}`), ''].join('\n');
}

process.stdout.write(section('Deutsch', entry.de) + '\n' + section('English', entry.en));
