<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$dbPath = $root . '/var/doio.sqlite';

if (!file_exists($dbPath)) {
    fwrite(STDERR, "Database not found at var/doio.sqlite. Run 'composer run db:init' first.\n");
    exit(1);
}

$app = $argv[1] ?? 'Rebelle';

$items = [
    // Color adjustments
    ['A(KC_W)', 'Set Warmer Color'],
    ['A(KC_C)', 'Set Cooler Color'],
    ['A(KC_H)', 'Increase Hue/Red'],
    ['A(S(KC_H))', 'Decrease Hue/Red'],
    ['A(KC_S)', 'Increase Saturation/Green'],
    ['A(S(KC_S))', 'Decrease Saturation/Green'],
    ['A(KC_L)', 'Increase Lightness/Blue'],
    ['A(S(KC_L))', 'Decrease Lightness/Blue'],

    // View
    ['C(KC_0)', 'Fit to Screen'],
    ['KC_0', 'Zoom 100%'],
    ['S(KC_F)', 'Flip Viewport'],
    ['KC_R', 'Rotate Canvas'],
    ['C(A(KC_LEFT))', 'Rotate CCW'],
    ['C(A(KC_RIGHT))', 'Rotate CW'],
    ['C(A(KC_0))', 'Reset Rotation'],

    // Tools
    ['KC_B', 'Go to Last Paint Brush'],
    ['S(KC_E)', 'Go to Last Erase Brush'],
    ['KC_E', 'Eraser'],
    ['KC_N', 'Blend'],
    ['KC_S', 'Smudge'],
    ['KC_L', 'Fill'],
    ['KC_I', 'Pick Color'],
    ['KC_W', 'Water'],
    ['KC_Y', 'Dry'],
    ['KC_O', 'Blow'],
    ['KC_X', 'Mix Mode'],
    ['S(KC_W)', 'Watercolors'],
    ['S(KC_O)', 'Oils & Acrylics'],
    ['S(KC_A)', 'Express Oils'],
    ['S(KC_T)', 'Pastels'],
    ['S(KC_N)', 'Pencils'],
    ['S(KC_I)', 'Inks'],
    ['S(KC_M)', 'Markers'],
    ['S(KC_H)', 'Airbrushes'],

    // Brushes & Painting
    ['KC_RBRC', 'Increase Brush Size'],
    ['KC_LBRC', 'Decrease Brush Size'],
    ['C(KC_RBRC)', 'Increase Brush Opacity'],
    ['C(KC_LBRC)', 'Decrease Brush Opacity'],
    ['C(S(KC_RBRC))', 'Increase Brush Pressure'],
    ['C(S(KC_LBRC))', 'Decrease Brush Pressure'],
    ['KC_1', 'Paint Mode'],
    ['KC_2', 'Paint & Mix'],
    ['KC_3', 'Paint & Blend'],
    ['KC_4', 'Blend Mode'],
    ['KC_5', 'Erase Mode'],
    ['KC_V', 'Switch between Paint and Blend'],
    ['A(KC_D)', 'Dirty Brush'],
    ['A(KC_M)', 'MultiColored Brush'],

    // Working with Water
    ['KC_H', 'Show Wet'],
    ['KC_D', 'Pause Diffusion'],
    ['S(KC_L)', 'Wet the Layer'],
    ['S(KC_V)', 'Wet All Visible'],
    ['S(KC_D)', 'Dry the Layer'],
    ['KC_F', 'Fast Dry'],

    // Favorite Brushes
    ['KC_6', 'Select First Brush Preset'],
    ['KC_7', 'Select Second Brush Preset'],
    ['KC_8', 'Select Third Brush Preset'],
    ['KC_9', 'Select Fourth Brush Preset'],

    // Panels (a few common)
    ['KC_F8', 'Brushes Panel'],
    ['KC_F6', 'Color Panel'],
    ['KC_F7', 'Layers Panel'],
    ['C(S(KC_M))', 'Mixing Palette'],
    ['C(KC_K)', 'Navigator'],
    ['C(S(KC_W))', 'Preview'],
    ['KC_F3', 'Tools Panel'],
    ['KC_F4', 'Properties Panel'],
    ['KC_F10', 'Stencils Panel'],
    ['KC_F12', 'Visual Settings'],
    ['S(KC_R)', 'Rulers'],
    ['KC_F5', 'Brush Creator'],

    // Files
    ['C(KC_N)', 'New'],
    ['C(KC_O)', 'Open'],
    ['C(KC_S)', 'Save'],
    ['C(S(KC_S))', 'Save As'],
    ['C(A(KC_S))', 'Iterative Save'],
    ['C(S(KC_O))', 'Import Image'],
    ['C(S(KC_A))', 'Import Assets'],
    ['C(KC_COMM)', 'Open Preferences'],
    ['A(S(KC_K))', 'Open Keyboard Shortcuts'],

    // Edit
    ['C(KC_Z)', 'Undo'],
    ['C(S(KC_Z))', 'Redo'],
    ['C(KC_X)', 'Cut'],
    ['C(KC_C)', 'Copy'],
    ['C(KC_V)', 'Paste'],

    // View
    ['KC_EQUAL', 'Zoom In'],
    ['KC_MINUS', 'Zoom Out'],
    ['C(KC_EQUAL)', 'Zoom In'],
    ['C(KC_MINUS)', 'Zoom Out'],
    ['KC_DOT', 'Fit to Screen'],
    ['KC_0', 'Zoom 100%'],
    ['KC_R', 'Rotate Canvas'],
    ['S(KC_G)', 'Show Grid'],
    ['KC_TAB', 'Desktop / Tablet Mode'],

    // Color Filters
    ['C(KC_M)', 'Brightness/Contrast'],
    ['C(KC_U)', 'Hue/Saturation'],
    ['C(KC_B)', 'Color Balance'],
    ['C(S(KC_F))', 'Color Filter'],
    ['C(S(KC_J))', 'Colorize'],
    ['C(S(KC_U))', 'Desaturate'],
    ['C(KC_I)', 'Invert'],

    // Color (panel operations and toggles)
    ['KC_G', 'View Greyscale'],
    ['C(KC_BSLS)', 'Switch Primary & Secondary Color'],
    ['A(KC_BSLS)', 'Open System Color Dialog'],
    ['KC_C', 'Use Primary Color'],

    // Selections
    ['KC_M', 'Activate Selection Tool'],
    ['C(A(KC_R))', 'Rectangle Selection'],
    ['C(A(KC_E))', 'Ellipse Selection'],
    ['C(A(KC_P))', 'Polygon Selection'],
    ['C(A(KC_F))', 'Freehand Selection'],
    ['C(A(KC_W))', 'Magic Wand Selection'],
    ['KC_Q', 'Show/Hide Selection'],
    ['A(KC_Q)', 'Show/Hide Selection Lines'],
    ['C(S(KC_I))', 'Invert Selection'],
    ['C(KC_A)', 'Select All'],
    ['KC_D', 'Deselect All'],
    ['KC_ENT', 'Confirm Selection'],
    ['KC_ESC', 'Cancel Selection'],

    // Layers & Groups (common ones)
    ['C(S(KC_N))', 'Add New Layer'],
    ['C(S(KC_D))', 'Duplicate Layer'],
    ['C(KC_E)', 'Merge Layers'],
    ['A(S(KC_D))', 'Remove Layer'],
    ['C(KC_G)', 'Group Layers'],
    ['C(S(KC_G))', 'Ungroup Layers'],
    ['C(S(KC_E))', 'Merge Visible Layers'],
    ['C(A(KC_A))', 'Select All Layers'],
    ['A(S(KC_T))', 'Tracing Layer'],
];

try {
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');

    $sel = $pdo->prepare('SELECT id FROM translations WHERE doio_macro = :m AND ((:a IS NULL AND app IS NULL) OR app = :a) LIMIT 1');
    $ins = $pdo->prepare('INSERT INTO translations (doio_macro, app, human_label) VALUES (:m, :a, :h)');
    $upd = $pdo->prepare('UPDATE translations SET human_label = :h WHERE id = :id');

    $pdo->beginTransaction();
    $added = 0; $updated = 0;
    foreach ($items as $row) {
        [$macro, $label] = $row;
        $sel->execute([':m'=>$macro, ':a'=>$app]);
        $ex = $sel->fetch();
        if ($ex) {
            $upd->execute([':h'=>$label, ':id'=>$ex['id']]);
            $updated++;
        } else {
            $ins->execute([':m'=>$macro, ':a'=>$app, ':h'=>$label]);
            $added++;
        }
    }
    $pdo->commit();
    echo "Seeded Rebelle translations. Added: $added, Updated: $updated\n";
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, 'Seeding failed: ' . $e->getMessage() . "\n");
    exit(1);
}
