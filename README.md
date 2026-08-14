# MapLens

MapLens verbindet Details eines Fotos mit Orten auf einer interaktiven Weltkarte. Besucher zoomen durch Bilder, wählen SVG-Hotspots und sehen den zugehörigen Ort, Informationen und Links. Im geschützten Adminmodus lassen sich Fotos und Hotspots direkt bearbeiten.

## Architektur

- **Node.js + Express**: kompakte REST-API und Auslieferung des statischen Frontends
- **SQLite (better-sqlite3)**: lokale, transaktionale Speicherung ohne externen Dienst
- **Leaflet**: lokale Kartenbibliothek; Kacheladresse und Attribution liegen in `settings`
- **SVG**: Hotspots teilen das Koordinatensystem des Originalbildes. `x`, `y` und `radius` werden normalisiert gespeichert.
- **Vanilla JavaScript/CSS**: kein Frontend-Buildschritt, geringe Betriebs- und Updatekomplexität

Die SQLite-Datei liegt standardmäßig in `data/maplens.sqlite`, Uploads in `data/images/`. Passwörter werden mit bcrypt gehasht, Sessions in HttpOnly/SameSite-Cookies gespeichert. Uploads werden nach MIME-Typ, tatsächlichem Bildformat und Größe geprüft und unter UUID-Namen abgelegt.

## Entwicklung

Voraussetzung ist Node.js 22 oder neuer.

```bash
npm install
./dev.sh
```

Dann `http://localhost:8000` öffnen. Beim ersten Klick auf **Admin** wird lokal der erste Administrator angelegt (Passwort mindestens zehn Zeichen). Für einen dauerhaften Entwicklungs-Schlüssel `SESSION_SECRET` setzen.

## Einfache Installation in Debian/Ubuntu-LXC

Voraussetzung ist ein frischer Debian- oder Ubuntu-Container mit Root-Zugriff. Die aktuelle stabile Version wird mit einem Befehl heruntergeladen, per SHA-256 geprüft und als systemd-Dienst installiert:

```bash
curl -fsSL https://raw.githubusercontent.com/BenAhrdt/maplens/main/scripts/install-remote.sh | sudo bash
```

Danach ist MapLens unter `http://<SERVER-IP>/` erreichbar. Beim ersten Öffnen über **Admin** wird der erste Administrator angelegt. Der Installer richtet Node.js, nginx, den Anwendungsdienst und den abgesicherten Update-Dienst mit Autostart ein.

Alternativ kann aus einem geklonten Repository installiert werden:

```bash
git clone https://github.com/BenAhrdt/maplens.git
cd maplens
sudo ./install.sh
```

Verwaltung:

```bash
systemctl status maplens
systemctl restart maplens
journalctl -u maplens -f
```

Anwendung und Daten liegen getrennt unter `/opt/maplens`; Geheimnisse stehen mit restriktiven Rechten in `/etc/maplens.env`. Für öffentlich erreichbare Installationen sollte zusätzlich TLS eingerichtet werden.

## Automatische Updates

Nach der Anmeldung eines Administrators prüft MapLens beim Laden der Oberfläche, ob auf GitHub ein neueres Release verfügbar ist. Besucher und Betrachter sehen keine Updatefunktionen. Ein verfügbares Update wird nur angeboten und niemals ohne Bestätigung installiert.

Nach der Bestätigung läuft folgender Ablauf:

1. Der privilegienlose Webserver schreibt ausschließlich eine Updateanforderung.
2. Der separate systemd-Dienst `maplens-update.service` lädt das aktuelle Release direkt aus diesem Repository.
3. Die SHA-256-Prüfsumme und die Paketversion werden kontrolliert.
4. Unter `/opt/maplens/backups/` wird ein vollständiges Backup des Datenordners angelegt.
5. Programmdateien und Produktionsabhängigkeiten werden aktualisiert; Bilder und Datenbank bleiben erhalten.
6. MapLens startet neu und der Browser lädt die Anwendung automatisch erneut.

Eine manuelle Prüfung ist im Adminbereich über **Nach Updates suchen** möglich. Diagnose:

```bash
systemctl status maplens-update.service
journalctl -u maplens-update.service -n 100
```

Ein fehlgeschlagenes Update lässt die vorhandenen Daten unangetastet und zeigt dem Administrator den Fehler an. Das automatisch erzeugte Backup kann wie im Abschnitt „Backup“ beschrieben wiederhergestellt werden.

## Bedienung

Im Adminmodus Foto hochladen, **Zeichnen** wählen und in das Foto klicken. Den Kreis per Drag verschieben und über den weißen Griff bzw. Radiusregler skalieren. Kontinent, Land und Stadt wählen oder die Suche verwenden; der Kartenmarker lässt sich zur Feinpositionierung ziehen. Anschließend Texte und beliebig viele HTTP(S)-Links speichern. Ohne Adminmodus sind keine Bearbeitungsfunktionen sichtbar.

### Benutzer und Bildfreigaben

Admins können im Editor über **Benutzer verwalten** weitere Konten als Betrachter oder Admin anlegen, Rollen ändern und Passwörter zurücksetzen. Über **Sichtbarkeit des aktuellen Fotos** ist jedes Bild entweder öffentlich oder ausschließlich ausgewählten Betrachtern zugänglich. Die Zugriffskontrolle erfolgt serverseitig für Metadaten, Bilddatei und Hotspots. Der letzte Admin kann nicht gelöscht oder zum Betrachter herabgestuft werden.

## Geodaten

Die sofort nutzbare Seed-Datenbank enthält nur einige Demo-Orte. Für alle Länder und über 230.000 Orte ab 500 Einwohnern (plus Verwaltungssitze und alternative/lokalisierte Namen) genügt:

```bash
npm run setup:geodata
```

GeoNames-Daten stehen unter **Creative Commons Attribution 4.0**; die Namensnennung muss erhalten bleiben. Quelle und Lizenz: https://www.geonames.org/export/ und https://creativecommons.org/licenses/by/4.0/. Der Import arbeitet zeilenweise und legt indizierte Städte ab, sodass auch mehrere zehntausend Datensätze nicht als DOM-Liste geladen werden.

Standardmäßig werden OpenStreetMap-Standardkacheln verwendet. Für relevante Last ist ein eigener oder geeigneter Tile-Provider in `settings` zu konfigurieren. Es gelten die [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) und die ODbL-Attribution.

## REST-API

Wichtige Routen: `GET/POST /api/images`, `GET /api/images/:id`, `POST /api/images/:id/hotspots`, `PUT/DELETE /api/hotspots/:id`, `/api/continents`, `/api/countries`, `/api/cities`, `/api/cities/search`, `/api/albums` und `/api/auth/*`. Schreibzugriffe sind authentifiziert. Die API liefert konsistente JSON-Fehler; eine OpenAPI-Oberfläche ist in V1 nicht enthalten.

## Backup

Bei laufender Anwendung:

```bash
npm run backup
```

Das erzeugt ein datiertes `maplens-backup-….tar.gz` mit Datenbank und Bildern. Restore: Dienst stoppen, vorhandenes `data/` sichern, Archiv im Projektverzeichnis entpacken, Eigentümer prüfen und Dienst starten.

## Tests

```bash
npm test
```

Abgedeckt sind normalisierte Koordinaten/Skalierungsgrundlage, URL-Validierung, Authentifizierung, Hotspot-CRUD samt Beziehungen, geografische Suche, Bildfreigaben und geschützte Weltkartenpunkte.

## Projektstruktur

```text
server.js              API und Webserver
src/db.js              Schema/Migrationen und Demo-Geodaten
src/validation.js      Eingabevalidierung
public/                responsive Weboberfläche
scripts/               GeoNames-Import und Backup
deploy/                nginx und systemd
data/                   lokale Laufzeitdaten (nach dem Start)
test/                   automatisierte Tests
```

## Releases erstellen

Die Version in `package.json` erhöhen, Änderungen committen und einen passenden SemVer-Tag pushen:

```bash
npm version patch
git push origin main --follow-tags
```

Der GitHub-Workflow testet das Projekt und veröffentlicht automatisch `maplens.tar.gz` sowie `maplens.tar.gz.sha256`. Nur solche verifizierbaren Releasepakete akzeptiert der integrierte Updater.

## Lizenz

MapLens steht unter der MIT-Lizenz. GeoNames- und OpenStreetMap-Daten bzw. Kartenkacheln unterliegen ihren jeweils eigenen, oben verlinkten Lizenzen und Nutzungsbedingungen.
