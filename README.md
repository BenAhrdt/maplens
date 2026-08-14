# MapLens

MapLens verbindet markierte Bereiche in Fotos mit Orten auf einer interaktiven Weltkarte. Zu jedem Hotspot können Texte, eine Kartenposition und weiterführende Links hinterlegt werden.

Die Anwendung eignet sich beispielsweise für Reisebilder, Sammlungen, Erinnerungsfotos oder Bilder mit vielen geografischen Bezügen.

## Funktionen

- Fotos mit frei platzierbaren Hotspots verknüpfen
- Orte direkt auf der Weltkarte anzeigen
- Suche nach lokalen, deutschen und englischen Ortsnamen
- tolerante Suche bei Akzenten, Apostrophen, Leerzeichen und Bindestrichen
- deutsche und englische Benutzeroberfläche
- Fotos austauschen, ohne vorhandene Hotspots und Freigaben zu verlieren
- öffentliche oder benutzerspezifische Foto-Freigaben
- eigene Farben, Beschreibungen und Links pro Hotspot
- automatische, bestätigungspflichtige Updates mit vorherigem Backup
- responsive Darstellung auf Desktop und Mobilgeräten

## Installation auf Debian oder Ubuntu

Benötigt wird ein Debian- oder Ubuntu-System beziehungsweise LXC mit Root-Zugriff.

```bash
curl -fsSL https://raw.githubusercontent.com/BenAhrdt/maplens/main/scripts/install-remote.sh | sudo bash
```

Der Installer richtet MapLens, Node.js, nginx und die benötigten systemd-Dienste automatisch ein. Außerdem werden die vollständigen GeoNames-Ortsdaten importiert. Dieser Import kann beim ersten Start einige Minuten dauern.

Anschließend ist MapLens im Browser erreichbar:

```text
http://SERVER-IP/
```

Beim ersten Klick auf **Anmelden** wird der erste Administrator angelegt. Das Passwort muss mindestens zehn Zeichen lang sein.

Für eine öffentlich erreichbare Installation sollte anschließend HTTPS eingerichtet werden.

## Erste Schritte

1. Als Administrator anmelden.
2. Den Adminbereich öffnen.
3. Ein Foto und einen Bildtitel auswählen und hochladen.
4. Unter **Hotspot** auf **Zeichnen** klicken.
5. Im Foto auf die gewünschte Position klicken.
6. Titel, Beschreibung und Ort eintragen.
7. Optional Farbe, Kartenposition und weiterführende Links anpassen.
8. Den Hotspot speichern.

Hotspots lassen sich im Foto verschieben. Ihre Größe wird über den Radiusregler beziehungsweise den weißen Griff angepasst. Der Kartenmarker kann für eine genaue Position ebenfalls verschoben werden.

## Ortssuche

Die Suche berücksichtigt Originalnamen sowie deutsche und englische Alternativnamen. Beispielsweise führen sowohl `Köln` als auch `Cologne` zum passenden Ort.

Unterschiede durch Akzente, Apostrophe, Leerzeichen oder Bindestriche werden ignoriert. Dadurch funktionieren unter anderem `Paleochora`, `Palaiochora` und die originale Schreibweise `Palaióchora`.

Über **Ortsname für Anzeige** kann zusätzlich ein eigener Name wie „Zuhause“ oder „Sommerurlaub“ eingetragen werden.

## Vorhandenes Foto ersetzen

Soll eine überarbeitete Version eines Fotos verwendet werden, muss das Bild nicht neu angelegt werden.

1. Das betreffende Foto öffnen.
2. Im Adminbereich **Aktuelles Foto ersetzen** auswählen.
3. Die neue Bilddatei auswählen und den Austausch bestätigen.

Hotspots, Texte, Links, Kartenpositionen und Benutzerfreigaben bleiben erhalten. Bei einem deutlich anderen Seitenverhältnis weist MapLens darauf hin, dass die Positionen der Hotspots möglicherweise nachjustiert werden müssen.

## Benutzer und Sichtbarkeit

Unter **Benutzer verwalten** können weitere Administratoren oder Betrachter angelegt werden.

Über **Sichtbarkeit des aktuellen Fotos** kann ein Foto entweder:

- öffentlich und ohne Anmeldung sichtbar sein oder
- nur für ausgewählte Benutzer freigegeben werden.

Diese Einschränkung gilt auch für die Bilddatei, ihre Hotspots und die Punkte in der Weltansicht.

## Sprache ändern

Oben im Kopfbereich kann zwischen **DE** und **EN** gewechselt werden. Die Auswahl wird im Browser gespeichert. Beim ersten Besuch verwendet MapLens nach Möglichkeit die Sprache des Browsers.

## Updates

Administratoren werden über neue Versionen informiert. Eine Installation erfolgt niemals ohne Bestätigung.

Alternativ kann im Adminbereich **Nach Updates suchen** ausgewählt werden. Vor jedem Update erstellt MapLens automatisch ein Backup, installiert die neue Version und lädt die Browserseite nach dem Neustart selbstständig neu.

Vor der Installation zeigt der Update-Dialog die Änderungen der neuen Version an. Ein Klick auf die Versionsnummer im MapLens-Kopfbereich öffnet jederzeit den Versionsverlauf der letzten Releases.

Fotos, Benutzer, Hotspots und Einstellungen bleiben bei einem Update erhalten.

## Verwaltung und Fehlerdiagnose

Status prüfen:

```bash
systemctl status maplens
```

MapLens neu starten:

```bash
systemctl restart maplens
```

Protokoll live anzeigen:

```bash
journalctl -u maplens -f
```

Fehler des Update-Dienstes anzeigen:

```bash
journalctl -u maplens-update.service -n 100
```

Die Anwendung liegt unter `/opt/maplens`. Datenbank und Bilder befinden sich in `/opt/maplens/data`. Automatische Update-Backups werden unter `/opt/maplens/backups` abgelegt.

## Manuelles Backup

```bash
cd /opt/maplens
npm run backup
```

Das erzeugte Archiv enthält die Datenbank und sämtliche Bilder. Es sollte anschließend auf ein anderes System oder einen unabhängigen Datenträger kopiert werden.

Für eine Wiederherstellung MapLens zuerst stoppen, den vorhandenen Ordner `/opt/maplens/data` sichern und den `data`-Ordner aus dem Backup wieder unter `/opt/maplens` ablegen. Danach Eigentümer und Dienst wiederherstellen:

```bash
chown -R maplens:maplens /opt/maplens/data
systemctl start maplens
```

## Datenquellen und Lizenz

MapLens steht unter der MIT-Lizenz.

Ortsdaten stammen von [GeoNames](https://www.geonames.org/) und stehen unter [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Die Kartendarstellung verwendet standardmäßig Daten und Kacheln von [OpenStreetMap](https://www.openstreetmap.org/).
