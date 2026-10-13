<?php
/**
 * Formular-Versand für flubag.ch
 * Empfängt die Formulare der Website (JSON per POST) und sendet sie als E-Mail.
 * Läuft auf jedem Hosting mit PHP (z.B. Infomaniak). Empfänger unten anpassen.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$EMPFAENGER = 'flubag@flubag.ch';
$ABSENDER   = 'website@flubag.ch';   // Adresse der eigenen Domain verwenden (SPF)
$MIN_SEKUNDEN = 3;                   // Bots füllen schneller aus

function antwort(int $code, array $daten): void { http_response_code($code); echo json_encode($daten, JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') antwort(405, ['ok' => false, 'error' => 'Nur POST erlaubt']);
$roh = file_get_contents('php://input');
if (strlen($roh) > 20000) antwort(413, ['ok' => false, 'error' => 'Zu gross']);
$d = json_decode($roh, true);
if (!is_array($d)) antwort(400, ['ok' => false, 'error' => 'Ungültige Daten']);

// Spam-Schutz: Honeypot und Mindestzeit
if (!empty($d['website'])) antwort(200, ['ok' => true]);
if (isset($d['_t']) && is_numeric($d['_t']) && (microtime(true) * 1000 - (float)$d['_t']) < $MIN_SEKUNDEN * 1000) antwort(429, ['ok' => false, 'error' => 'Zu schnell']);

// Einfaches Rate-Limit pro IP (10 Anfragen pro Stunde)
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unbekannt';
$datei = sys_get_temp_dir() . '/flubag_form_' . md5($ip);
$liste = array_filter(is_file($datei) ? (array)json_decode((string)file_get_contents($datei), true) : [], fn($t) => $t > time() - 3600);
if (count($liste) >= 10) antwort(429, ['ok' => false, 'error' => 'Zu viele Anfragen']);
$liste[] = time();
@file_put_contents($datei, json_encode(array_values($liste)));

$formular = substr(strip_tags((string)($d['_form'] ?? 'Kontakt')), 0, 80);
$email = filter_var((string)($d['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$zeilen = [];
foreach ($d as $k => $v) {
  if (in_array($k, ['website', '_t', '_form', '_page'], true)) continue;
  $k = substr(preg_replace('/[^\p{L}\p{N}_ -]/u', '', (string)$k), 0, 60);
  $v = is_scalar($v) ? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE);
  $v = trim(str_replace(["\r\n", "\r"], "\n", strip_tags($v)));
  $zeilen[] = ucfirst($k) . ': ' . substr($v, 0, 4000);
}
$zeilen[] = '';
$zeilen[] = 'Seite: ' . substr(strip_tags((string)($d['_page'] ?? '')), 0, 300);
$zeilen[] = 'Zeit: ' . date('d.m.Y H:i');

$betreff = '=?UTF-8?B?' . base64_encode('[flubag.ch] ' . $formular) . '?=';
$kopf = [
  'From: FLUBAG Website <' . $ABSENDER . '>',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: 8bit',
];
if ($email) $kopf[] = 'Reply-To: ' . $email;

if (!@mail($EMPFAENGER, $betreff, implode("\n", $zeilen), implode("\r\n", $kopf))) antwort(500, ['ok' => false, 'error' => 'Versand fehlgeschlagen']);
antwort(200, ['ok' => true]);
