const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function openDatabase(filename = process.env.DB_PATH || path.join(process.cwd(), 'data', 'maplens.sqlite')) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS albums (id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS images (id INTEGER PRIMARY KEY, filename TEXT NOT NULL, original_name TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', width INTEGER NOT NULL, height INTEGER NOT NULL, mime_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS image_albums (image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE, album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE, PRIMARY KEY(image_id, album_id));
    CREATE TABLE IF NOT EXISTS continents (code TEXT PRIMARY KEY, name TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS countries (code TEXT PRIMARY KEY, continent_code TEXT NOT NULL REFERENCES continents(code), name TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS cities (id INTEGER PRIMARY KEY, country_code TEXT NOT NULL REFERENCES countries(code), name TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, population INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS idx_cities_country_name ON cities(country_code, name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_cities_name_pop ON cities(name COLLATE NOCASE, population DESC);
    CREATE TABLE IF NOT EXISTS city_names (city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE, name TEXT NOT NULL COLLATE NOCASE, PRIMARY KEY(city_id,name));
    CREATE INDEX IF NOT EXISTS idx_city_names_name ON city_names(name COLLATE NOCASE,city_id);
    CREATE TABLE IF NOT EXISTS hotspots (id INTEGER PRIMARY KEY, image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE, x REAL NOT NULL CHECK(x BETWEEN 0 AND 1), y REAL NOT NULL CHECK(y BETWEEN 0 AND 1), radius REAL NOT NULL CHECK(radius > 0 AND radius <= 1), title TEXT NOT NULL, short_description TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', continent_code TEXT REFERENCES continents(code), country_code TEXT REFERENCES countries(code), city_id INTEGER REFERENCES cities(id), latitude REAL CHECK(latitude BETWEEN -90 AND 90), longitude REAL CHECK(longitude BETWEEN -180 AND 180), color TEXT NOT NULL DEFAULT '#42d3ff', label TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS hotspot_links (id INTEGER PRIMARY KEY, hotspot_id INTEGER NOT NULL REFERENCES hotspots(id) ON DELETE CASCADE, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR IGNORE INTO settings(key,value) VALUES ('tile_url','https://tile.openstreetmap.org/{z}/{x}/{y}.png'), ('tile_attribution','&copy; OpenStreetMap contributors');
  `);
  if (!db.prepare("SELECT 1 FROM pragma_table_info('hotspots') WHERE name='map_zoom'").get()) db.exec('ALTER TABLE hotspots ADD COLUMN map_zoom INTEGER NOT NULL DEFAULT 12 CHECK(map_zoom BETWEEN 2 AND 19)');
  if (!db.prepare("SELECT 1 FROM pragma_table_info('hotspots') WHERE name='location_name'").get()) db.exec("ALTER TABLE hotspots ADD COLUMN location_name TEXT NOT NULL DEFAULT ''");
  if (!db.prepare("SELECT 1 FROM pragma_table_info('users') WHERE name='role'").get()) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','viewer')); UPDATE users SET role='admin' WHERE id=(SELECT MIN(id) FROM users)");
  if (!db.prepare("SELECT 1 FROM pragma_table_info('images') WHERE name='visibility'").get()) db.exec("ALTER TABLE images ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','restricted'))");
  db.exec('CREATE TABLE IF NOT EXISTS image_viewers (image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(image_id,user_id)); CREATE INDEX IF NOT EXISTS idx_image_viewers_user ON image_viewers(user_id,image_id)');
  seedGeo(db); return db;
}
function seedGeo(db) {
  const continents=[['AF','Afrika',2,20],['AS','Asien',34,100],['EU','Europa',54,15],['NA','Nordamerika',45,-100],['OC','Ozeanien',-22,135],['SA','Südamerika',-15,-60]];
  const countries=[['DE','EU','Deutschland',51,10],['FR','EU','Frankreich',46,2],['US','NA','Vereinigte Staaten',39,-98],['JP','AS','Japan',36,138],['AU','OC','Australien',-25,133]];
  const cities=[[2950159,'DE','Berlin',52.52,13.405,3644826],[2988507,'FR','Paris',48.8534,2.3488,2138551],[5128581,'US','New York',40.7143,-74.006,8804190],[1850147,'JP','Tokyo',35.6895,139.6917,13960000],[2147714,'AU','Sydney',-33.8679,151.2073,5312163],[2907911,'DE','Heidelberg',49.4077,8.6908,162273],[2907669,'DE','Heilbronn',49.1427,9.2109,126458]];
  const a=db.prepare('INSERT OR IGNORE INTO continents VALUES (?,?,?,?)'),b=db.prepare('INSERT OR IGNORE INTO countries VALUES (?,?,?,?,?)'),c=db.prepare('INSERT OR IGNORE INTO cities VALUES (?,?,?,?,?,?)');
  const alias=db.prepare('INSERT OR IGNORE INTO city_names(city_id,name) VALUES (?,?)'),aliases=[[1850147,'Tokio']];
  db.transaction(()=>{continents.forEach(x=>a.run(...x));countries.forEach(x=>b.run(...x));cities.forEach(x=>{c.run(...x);alias.run(x[0],x[2])});aliases.forEach(x=>alias.run(...x))})();
}
module.exports={openDatabase};
