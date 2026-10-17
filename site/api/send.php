<?php
/**
 * Formular-Versand für flubag.ch
 * Empfängt die Formulare der Website (JSON per POST) und sendet sie als E-Mail.
 * Läuft auf jedem Hosting mit PHP (z.B. Infomaniak). Empfänger unten anpassen.
 * Bei jedem Fehler (4xx/5xx) öffnet die Website automatisch das E-Mail-Programm, es geht also nichts verloren.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$EMPFAENGER = 'flubag@flubag.ch';
$ABSENDER   = 'website@flubag.ch';   // Adresse der eigenen Domain verwenden (SPF)
$MIN_SEKUNDEN = 3;                   // Bots füllen schneller aus
$MAX_STUNDEN  = 48;                  // ältere Formulare (Zeitstempel) ablehnen
$ERLAUBTE_HOSTS = ['www.flubag.ch', 'flubag.ch']; // Herkunft der Formulare (die eigene Adresse ist immer erlaubt)

function antwort(int $code, array $daten): void { http_response_code($code); echo json_encode($daten, JSON_UNESCAPED_UNICODE); exit; }
// Steuerzeichen entfernen, Zeilenumbrüche und Tabulatoren behalten
function sauber(string $s): string { return preg_replace('/[^\P{C}\n\t]/u', '', $s) ?? ''; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') antwort(405, ['ok' => false, 'error' => 'Nur POST erlaubt']);

// Nur Anfragen von der eigenen Website (Browser senden bei POST immer einen Origin Header)
$herkunft = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($herkunft !== '') {
  $host = strtolower((string)parse_url($herkunft, PHP_URL_HOST));
  $eigener = strtolower((string)preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
  if ($host === '' || ($host !== $eigener && !in_array($host, $ERLAUBTE_HOSTS, true))) antwort(403, ['ok' => false, 'error' => 'Nicht erlaubt']);
}

$roh = (string)file_get_contents('php://input');
if (strlen($roh) > 20000) antwort(413, ['ok' => false, 'error' => 'Zu gross']);
$d = json_decode($roh, true, 4);
if (!is_array($d) || count($d) > 60) antwort(400, ['ok' => false, 'error' => 'Ungültige Daten']);

// Spam-Schutz: Honeypot und Zeitstempel (Pflicht, mindestens 3 Sekunden und höchstens 48 Stunden alt)
if (!empty($d['website'])) antwort(200, ['ok' => true]);
// _dt ist die im Browser gemessene Ausfülldauer (hängt nicht von der Uhr des Geräts ab), _t der Fallback
if (isset($d['_dt']) && is_numeric($d['_dt'])) $alter = (float)$d['_dt'] / 1000;
else $alter = isset($d['_t']) && is_numeric($d['_t']) ? (microtime(true) * 1000 - (float)$d['_t']) / 1000 : -1;
if ($alter < $MIN_SEKUNDEN || $alter > $MAX_STUNDEN * 3600) antwort(429, ['ok' => false, 'error' => 'Bitte erneut senden']);

// Einfaches Rate-Limit pro IP (10 Anfragen pro Stunde)
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unbekannt';
$datei = sys_get_temp_dir() . '/flubag_form_' . md5($ip);
$liste = array_filter(is_file($datei) ? (array)json_decode((string)file_get_contents($datei), true) : [], fn($t) => is_int($t) && $t > time() - 3600);
if (count($liste) >= 10) antwort(429, ['ok' => false, 'error' => 'Zu viele Anfragen']);
$liste[] = time();
@file_put_contents($datei, json_encode(array_values($liste)), LOCK_EX);

$formular = substr(trim((string)preg_replace('/\s+/u', ' ', sauber(strip_tags((string)($d['_form'] ?? 'Kontakt'))))), 0, 80);
$email = filter_var(trim((string)($d['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$zeilen = [];
$inhalt = 0;
foreach ($d as $k => $v) {
  if (in_array($k, ['website', '_t', '_dt', '_form', '_page'], true)) continue;
  $k = substr((string)preg_replace('/[^\p{L}\p{N}_ -]/u', '', (string)$k), 0, 60);
  $v = is_scalar($v) ? (string)$v : (string)json_encode($v, JSON_UNESCAPED_UNICODE);
  $v = trim(str_replace(["\r\n", "\r"], "\n", sauber(strip_tags($v))));
  if ($k === '' || $v === '') continue;
  $inhalt++;
  $zeilen[] = ucfirst($k) . ': ' . (function_exists('mb_substr') ? mb_substr($v, 0, 4000) : substr($v, 0, 4000));
}
if ($inhalt === 0) antwort(400, ['ok' => false, 'error' => 'Keine Angaben']);
$links = preg_match_all('~https?://~i', implode("\n", $zeilen));
$zeilen[] = '';
$zeilen[] = 'Seite: ' . substr(sauber(strip_tags((string)($d['_page'] ?? ''))), 0, 300);
$zeilen[] = 'Zeit: ' . date('d.m.Y H:i');

// Viele Links: nicht verwerfen (keine Fehlalarme), aber im Betreff markieren
$betreff = '=?UTF-8?B?' . base64_encode(($links > 3 ? '[Spamverdacht] ' : '') . '[flubag.ch] ' . $formular) . '?=';
$kopf = [
  'From: FLUBAG Website <' . $ABSENDER . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',   // keine überlangen Zeilen (höchstens 998 Zeichen pro Zeile erlaubt)
];
if ($email) $kopf[] = 'Reply-To: ' . $email;

$text = chunk_split(base64_encode(str_replace("\n", "\r\n", implode("\n", $zeilen))));
// -f setzt den Envelope-Absender (Rückläufer und SPF passen zur eigenen Domain)
if (!@mail($EMPFAENGER, $betreff, $text, implode("\r\n", $kopf), '-f' . $ABSENDER)) antwort(500, ['ok' => false, 'error' => 'Versand fehlgeschlagen']);
antwort(200, ['ok' => true]);
