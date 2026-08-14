const fs = require('fs');
const readline = require('readline');
const { openDatabase, normalizePlaceName } = require('../src/db');

const file = process.argv[2];
const countryInfo = process.argv[3];
if (!file || !countryInfo) {
  console.error('Aufruf: npm run import:geonames -- cities500.txt countryInfo.txt');
  process.exit(1);
}

const db = openDatabase();
const countryLines = fs.readFileSync(countryInfo, 'utf8').split(/\r?\n/).filter(x => x && !x.startsWith('#'));
const continents = new Set(db.prepare('SELECT code FROM continents').all().map(x => x.code));
const countries = new Set();
const putCountry = db.prepare('INSERT OR REPLACE INTO countries(code,continent_code,name,latitude,longitude) VALUES (?,?,?,?,?)');
db.transaction(() => countryLines.forEach(line => {
  const x = line.split('\t');
  if (continents.has(x[8])) {
    putCountry.run(x[0], x[8], x[4], 0, 0);
    countries.add(x[0]);
  }
}))();

const put = db.prepare('INSERT OR REPLACE INTO cities(id,country_code,name,latitude,longitude,population) VALUES (?,?,?,?,?,?)');
const putName = db.prepare('INSERT OR REPLACE INTO city_names(city_id,name,search_name) VALUES (?,?,?)');
let count = 0;
let batch = [];
function flush() {
  db.transaction(rows => rows.forEach(({ city, names }) => {
    put.run(...city);
    names.forEach(name => putName.run(city[0], name, normalizePlaceName(name)));
  }))(batch);
  batch = [];
}

(async () => {
  for await (const line of readline.createInterface({ input: fs.createReadStream(file) })) {
    const x = line.split('\t');
    if (countries.has(x[8])) {
      const id = Number(x[0]);
      const names = [x[1], x[2], ...(x[3] || '').split(',')].map(n => n.trim()).filter(Boolean);
      batch.push({ city: [id, x[8], x[1], Number(x[4]), Number(x[5]), Number(x[14]) || 0], names: [...new Set(names)] });
      count++;
      if (batch.length === 1000) flush();
    }
  }
  if (batch.length) flush();
  db.exec('UPDATE countries SET latitude=COALESCE((SELECT SUM(latitude*(population+1))/SUM(population+1) FROM cities WHERE country_code=countries.code),0), longitude=COALESCE((SELECT SUM(longitude*(population+1))/SUM(population+1) FROM cities WHERE country_code=countries.code),0)');
  console.log(`${countries.size} Länder und ${count} GeoNames-Orte samt alternativen Namen importiert.`);
  db.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
