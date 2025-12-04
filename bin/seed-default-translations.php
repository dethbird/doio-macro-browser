<?php
/**
 * Seed default (generic) translations for common VIA macros.
 * These apply to all profiles as fallback when no profile-specific translation exists.
 * 
 * Usage: php bin/seed-default-translations.php
 */
declare(strict_types=1);

$root = dirname(__DIR__);
$dbPath = $root . '/var/database.sqlite';

if (!file_exists($dbPath)) {
    fwrite(STDERR, "Database not found at var/database.sqlite. Run 'php bin/init-db.php' first.\n");
    exit(1);
}

// Default translations (profile_id = NULL)
// These are common shortcuts used across painting/creative apps like Rebelle, Photoshop, etc.
// Many shortcuts sourced from: https://escapemotions.com/products/rebelle/manual/8/keyboard-shortcuts/
$items = [
    // Color adjustments
    ['A(KC_W)', 'Set Warmer Color'],
    ['A(KC_C)', 'Set Cooler Color'],
    ['A(KC_H)', 'Increase Hue/Red'],
    ['A(S(KC_H))', 'Decrease Hue/Red'],
    ['LSA(KC_H)', 'Decrease Hue/Red'],
    ['A(KC_S)', 'Increase Saturation/Green'],
    ['A(S(KC_S))', 'Decrease Saturation/Green'],
    ['LSA(KC_S)', 'Decrease Saturation/Green'],
    ['A(KC_L)', 'Increase Lightness/Blue'],
    ['A(S(KC_L))', 'Decrease Lightness/Blue'],
    ['LSA(KC_L)', 'Decrease Lightness/Blue'],

    // View / Zoom
    ['C(KC_0)', 'Fit to Screen'],
    ['KC_0', 'Zoom 100%'],
    ['S(KC_F)', 'Flip Viewport'],
    ['KC_R', 'Rotate Canvas'],
    ['C(A(KC_LEFT))', 'Rotate CCW'],
    ['LCA(KC_LEFT)', 'Rotate CCW'],
    ['C(A(KC_RIGHT))', 'Rotate CW'],
    ['LCA(KC_RIGHT)', 'Rotate CW'],
    ['C(A(KC_0))', 'Reset Rotation'],
    ['LCA(KC_0)', 'Reset Rotation'],
    ['KC_EQL', 'Zoom In'],
    ['KC_MINS', 'Zoom Out'],
    ['C(KC_EQL)', 'Zoom In'],
    ['C(KC_MINS)', 'Zoom Out'],
    ['KC_DOT', 'Fit to Screen'],
    ['S(KC_G)', 'Show Grid'],
    ['S(KC_U)', 'Show Guides'],
    ['S(KC_Y)', 'Show Ref Image on Canvas'],
    ['C(S(KC_X))', 'Show Cursor'],
    ['KC_TAB', 'Desktop/Tablet Mode'],

    // Tools
    ['KC_B', 'Brush Tool'],
    ['S(KC_B)', 'Favorite Brush'],
    ['S(KC_E)', 'Last Erase Brush'],
    ['KC_E', 'Eraser'],
    ['KC_N', 'Blend'],
    ['KC_S', 'Smudge'],
    ['S(KC_C)', 'Clone Tool'],
    ['KC_L', 'Fill'],
    ['KC_I', 'Pick Color'],
    ['KC_W', 'Water'],
    ['C(KC_SCLN)', 'Decrease Brush Water'],
    ['C(KC_QUOT)', 'Increase Brush Water'],
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
    ['KC_T', 'Transform'],
    ['LCA(KC_I)', 'Image Size'],
    ['LCA(KC_C)', 'Canvas Size'],

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
    ['KC_V', 'Switch Paint/Blend'],
    ['KC_A', 'Switch Paint/Erase'],
    ['A(KC_D)', 'Dirty Brush'],
    ['A(KC_M)', 'MultiColored Brush'],

    // Working with Brush Presets
    ['C(S(KC_C))', 'Copy Brush Preset'],
    ['C(S(KC_V))', 'Paste Brush Preset'],
    ['C(S(KC_P))', 'Duplicate/Save Brush Preset'],
    ['C(S(KC_H))', 'Reset Brush Changes'],
    ['C(S(KC_B))', 'Save Changes as Default'],

    // Working with Water
    ['KC_H', 'Show Wet'],
    ['KC_D', 'Pause Diffusion'],
    ['S(KC_L)', 'Wet the Layer'],
    ['S(KC_V)', 'Wet All Visible'],
    ['S(KC_D)', 'Dry the Layer'],
    ['KC_F', 'Fast Dry'],
    ['A(KC_T)', 'Enable/Disable Canvas Tilt'],

    // Favorite Brushes / Presets
    ['KC_6', 'Brush Preset 1'],
    ['KC_7', 'Brush Preset 2'],
    ['KC_8', 'Brush Preset 3'],
    ['KC_9', 'Brush Preset 4'],

    // Panels
    ['KC_F1', 'Help'],
    ['KC_F3', 'Tools Panel'],
    ['KC_F4', 'Properties Panel'],
    ['KC_F5', 'Brush Creator'],
    ['KC_F6', 'Color Panel'],
    ['KC_F7', 'Layers Panel'],
    ['KC_F8', 'Brushes Panel'],
    ['KC_F10', 'Assets Panel'],
    ['KC_F12', 'Visual Settings'],
    ['C(S(KC_M))', 'Mixing Palette'],
    ['C(KC_K)', 'Navigator'],
    ['C(S(KC_W))', 'Preview'],
    ['C(KC_L)', 'Tilt Panel'],
    ['S(KC_R)', 'Rulers'],
    ['C(S(KC_R))', 'Reference Images'],
    ['C(KC_R)', 'Show/Hide Ref Images'],
    ['C(KC_J)', 'Volume Presets'],
    ['C(S(KC_T))', 'Record Time-lapse'],

    // Files
    ['C(KC_N)', 'New'],
    ['C(KC_O)', 'Open'],
    ['C(KC_S)', 'Save'],
    ['C(S(KC_S))', 'Save As'],
    ['C(A(KC_S))', 'Iterative Save'],
    ['LCA(KC_S)', 'Iterative Save'],
    ['C(S(KC_O))', 'Import Image'],
    ['C(S(KC_A))', 'Import Assets'],
    ['C(KC_COMM)', 'Preferences'],
    ['A(S(KC_K))', 'Keyboard Shortcuts'],
    ['LSA(KC_K)', 'Keyboard Shortcuts'],

    // Edit
    ['C(KC_Z)', 'Undo'],
    ['C(S(KC_Z))', 'Redo'],
    ['C(KC_X)', 'Cut'],
    ['C(KC_C)', 'Copy'],
    ['C(KC_V)', 'Paste'],

    // Color Filters
    ['C(KC_M)', 'Brightness/Contrast'],
    ['C(KC_U)', 'Hue/Saturation'],
    ['C(KC_B)', 'Color Balance'],
    ['C(S(KC_F))', 'Color Filter'],
    ['C(S(KC_J))', 'Colorize'],
    ['C(S(KC_U))', 'Desaturate'],
    ['C(KC_I)', 'Invert Colors'],

    // Color panel
    ['KC_G', 'View Greyscale'],
    ['C(KC_BSLS)', 'Switch Primary/Secondary'],
    ['A(KC_BSLS)', 'System Color Dialog'],
    ['KC_C', 'Use Primary Color'],

    // Color Management
    ['C(S(KC_K))', 'Color Management'],
    ['C(KC_Y)', 'Proof Colors'],
    ['C(S(KC_Y))', 'Gamut Warning'],

    // Selections
    ['KC_M', 'Selection Tool'],
    ['C(A(KC_R))', 'Rectangle Selection'],
    ['LCA(KC_R)', 'Rectangle Selection'],
    ['C(A(KC_E))', 'Ellipse Selection'],
    ['LCA(KC_E)', 'Ellipse Selection'],
    ['C(A(KC_P))', 'Polygon Selection'],
    ['LCA(KC_P)', 'Polygon Selection'],
    ['C(A(KC_L))', 'Freehand with Lines Selection'],
    ['LCA(KC_L)', 'Freehand with Lines Selection'],
    ['C(A(KC_F))', 'Freehand Selection'],
    ['LCA(KC_F)', 'Freehand Selection'],
    ['C(A(KC_W))', 'Magic Wand'],
    ['LCA(KC_W)', 'Magic Wand'],
    ['KC_Q', 'Show/Hide Selection'],
    ['A(KC_Q)', 'Show/Hide Selection Lines'],
    ['C(S(KC_I))', 'Invert Selection'],
    ['C(KC_A)', 'Select All'],
    ['C(KC_D)', 'Deselect All'],
    ['KC_ENT', 'Confirm'],
    ['KC_ESC', 'Cancel'],

    // Selection Movement
    ['KC_UP', 'Move Up 1px'],
    ['KC_DOWN', 'Move Down 1px'],
    ['KC_LEFT', 'Move Left 1px'],
    ['KC_RIGHT', 'Move Right 1px'],
    ['S(KC_UP)', 'Move Up 10px'],
    ['S(KC_DOWN)', 'Move Down 10px'],
    ['S(KC_LEFT)', 'Move Left 10px'],
    ['S(KC_RIGHT)', 'Move Right 10px'],

    // Layers & Groups
    ['C(S(KC_N))', 'New Layer'],
    ['LCA(KC_G)', 'New Group'],
    ['C(S(KC_D))', 'Duplicate Layer'],
    ['C(KC_E)', 'Merge Layers'],
    ['A(S(KC_D))', 'Remove Layer'],
    ['LSA(KC_D)', 'Remove Layer'],
    ['C(KC_G)', 'Group Layers'],
    ['C(S(KC_G))', 'Ungroup Layers'],
    ['C(S(KC_E))', 'Merge Visible'],
    ['C(A(KC_A))', 'Select All Layers'],
    ['LCA(KC_A)', 'Select All Layers'],
    ['C(KC_DOT)', 'Show/Hide Layer Group'],
    ['KC_DEL', 'Clear Layer'],
    ['C(KC_SLSH)', 'Lock Layer'],
    ['KC_SLSH', 'Lock Layer Transparency'],
    ['A(KC_MINS)', 'Move Layers Up'],
    ['A(KC_EQL)', 'Move Layers Down'],
    ['A(KC_LBRC)', 'Select Prev Layer'],
    ['A(KC_RBRC)', 'Select Next Layer'],
    ['A(KC_N)', 'Rename Layer'],
    ['A(S(KC_T))', 'Tracing Layer'],
    ['LSA(KC_T)', 'Tracing Layer'],

    // Stencils
    ['LSA(KC_N)', 'Show/Hide Stencil'],

    // Sliders
    ['KC_PGUP', 'Increase Value +10'],
    ['KC_PGDN', 'Decrease Value -10'],

    // General/Other
    ['KC_SPC', 'Play/Pause'],
];

try {
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');

    // Check for existing generic translation
    $sel = $pdo->prepare('SELECT id FROM translation WHERE via_macro = :m AND profile_id IS NULL LIMIT 1');
    $ins = $pdo->prepare('INSERT INTO translation (via_macro, profile_id, human_label) VALUES (:m, NULL, :h)');
    $upd = $pdo->prepare('UPDATE translation SET human_label = :h WHERE id = :id');

    $pdo->beginTransaction();
    $added = 0;
    $updated = 0;
    
    foreach ($items as $row) {
        [$macro, $label] = $row;
        $sel->execute([':m' => $macro]);
        $existing = $sel->fetch();
        
        if ($existing) {
            $upd->execute([':h' => $label, ':id' => $existing['id']]);
            $updated++;
        } else {
            $ins->execute([':m' => $macro, ':h' => $label]);
            $added++;
        }
    }
    
    $pdo->commit();
    echo "Seeded default translations. Added: $added, Updated: $updated\n";
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, 'Seeding failed: ' . $e->getMessage() . "\n");
    exit(1);
}
