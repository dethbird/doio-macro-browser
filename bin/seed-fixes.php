<?php
declare(strict_types=1);

// Upsert a few translation fixes into the SQLite DB
// Usage: php bin/seed-fixes.php

$root = dirname(__DIR__);
$dbPath = $root . '/var/doio.sqlite';
if (!is_file($dbPath)) {
    fwrite(STDERR, "DB not found at $dbPath. Run composer run db:init first.\n");
    exit(1);
}

try {
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');

    $items = [
        // Lightness
        ['doio_macro' => 'A(KC_L)', 'app' => 'Rebelle', 'human_label' => 'Increase Lightness'],
        ['doio_macro' => 'LSA(KC_L)', 'app' => 'Rebelle', 'human_label' => 'Decrease Lightness'],
        // Hue
        ['doio_macro' => 'A(KC_H)', 'app' => 'Rebelle', 'human_label' => 'Increase Hue'],
        ['doio_macro' => 'LSA(KC_H)', 'app' => 'Rebelle', 'human_label' => 'Decrease Hue'],
        // Saturation (assumed Alt+S / Alt+Shift+S)
        ['doio_macro' => 'A(KC_S)', 'app' => 'Rebelle', 'human_label' => 'Increase Saturation'],
        ['doio_macro' => 'LSA(KC_S)', 'app' => 'Rebelle', 'human_label' => 'Decrease Saturation'],
        // Favorites
        ['doio_macro' => 'S(KC_B)', 'app' => 'Rebelle', 'human_label' => 'Favorite Brushes'],
        // Additional fixes
        ['doio_macro' => 'C(S(KC_R))', 'app' => 'Rebelle', 'human_label' => 'Reference Image'],
        ['doio_macro' => 'C(KC_L)', 'app' => 'Rebelle', 'human_label' => 'Tilt'],
        // Zoom
        ['doio_macro' => 'C(KC_EQL)', 'app' => 'Rebelle', 'human_label' => 'Zoom In'],
        ['doio_macro' => 'C(KC_MINS)', 'app' => 'Rebelle', 'human_label' => 'Zoom Out'],
        // Pan (Space)
        ['doio_macro' => 'KC_SPC', 'app' => 'Rebelle', 'human_label' => 'Pan'],
        // Pick / Mix Pick
        ['doio_macro' => 'KC_LALT', 'app' => 'Rebelle', 'human_label' => 'Pick Color'],
        ['doio_macro' => 'KC_X', 'app' => 'Rebelle', 'human_label' => 'Mix Pick Color'],
        // Diffusion control
        ['doio_macro' => 'KC_D', 'app' => 'Rebelle', 'human_label' => '(Un)Pause Diffusion'],
        // Reset Rotation
        ['doio_macro' => 'LCA(KC_0)', 'app' => 'Rebelle', 'human_label' => 'Reset Rotation'],
    ];

    $sel = $pdo->prepare('SELECT id FROM translations WHERE doio_macro = :m AND ((:a IS NULL AND app IS NULL) OR app = :a) LIMIT 1');
    $ins = $pdo->prepare('INSERT INTO translations (doio_macro, app, human_label) VALUES (:m, :a, :h)');
    $upd = $pdo->prepare('UPDATE translations SET human_label = :h WHERE id = :id');

    $pdo->beginTransaction();
    $count = 0;
    foreach ($items as $t) {
        $m = $t['doio_macro'];
        $a = $t['app'];
        $h = $t['human_label'];
        $sel->execute([':m' => $m, ':a' => $a]);
        $row = $sel->fetch();
        if ($row) {
            $upd->execute([':h' => $h, ':id' => $row['id']]);
        } else {
            $ins->execute([':m' => $m, ':a' => $a, ':h' => $h]);
        }
        $count++;
    }
    $pdo->commit();

    echo "Applied $count translation fixes.\n";
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction())
        $pdo->rollBack();
    fwrite(STDERR, "Failed: " . $e->getMessage() . "\n");
    exit(1);
}
