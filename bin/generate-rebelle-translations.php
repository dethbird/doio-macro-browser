<?php
/**
 * Generate VIA macro translations from Rebelle keyboard shortcuts.
 * This script converts human-readable shortcuts (like "Ctrl+Shift+M") 
 * to VIA macro format (like "C(S(KC_M))").
 * 
 * Usage: php bin/generate-rebelle-translations.php
 * 
 * Output can be copy/pasted into seed-default-translations.php
 */
declare(strict_types=1);

// Key mappings from human-readable to VIA format
$keyMap = [
    // Letters are just KC_{letter}
    // Numbers are just KC_{number}
    
    // Function keys
    'F1' => 'KC_F1', 'F2' => 'KC_F2', 'F3' => 'KC_F3', 'F4' => 'KC_F4',
    'F5' => 'KC_F5', 'F6' => 'KC_F6', 'F7' => 'KC_F7', 'F8' => 'KC_F8',
    'F9' => 'KC_F9', 'F10' => 'KC_F10', 'F11' => 'KC_F11', 'F12' => 'KC_F12',
    
    // Special keys
    'Enter' => 'KC_ENT',
    'Esc' => 'KC_ESC',
    'Tab' => 'KC_TAB',
    'Space' => 'KC_SPC',
    'Backspace' => 'KC_BSPC',
    'Del' => 'KC_DEL',
    'Delete' => 'KC_DEL',
    
    // Symbols
    '[' => 'KC_LBRC',
    ']' => 'KC_RBRC',
    '{' => 'KC_LBRC',  // Same key, just shifted
    '}' => 'KC_RBRC',  // Same key, just shifted
    ';' => 'KC_SCLN',
    "'" => 'KC_QUOT',
    ',' => 'KC_COMM',
    '.' => 'KC_DOT',
    '/' => 'KC_SLSH',
    '\\' => 'KC_BSLS',
    '-' => 'KC_MINS',
    '=' => 'KC_EQL',
    '+' => 'KC_EQL',   // + is Shift+=
    '0' => 'KC_0',
    '1' => 'KC_1', '2' => 'KC_2', '3' => 'KC_3', '4' => 'KC_4',
    '5' => 'KC_5', '6' => 'KC_6', '7' => 'KC_7', '8' => 'KC_8', '9' => 'KC_9',
    
    // Arrow keys
    'Up' => 'KC_UP',
    'Down' => 'KC_DOWN',
    'Left' => 'KC_LEFT',
    'Right' => 'KC_RIGHT',
    
    // Page navigation
    'Pg Up' => 'KC_PGUP',
    'Pg Down' => 'KC_PGDN',
    'Home' => 'KC_HOME',
    'End' => 'KC_END',
];

/**
 * Convert a human-readable shortcut to VIA macro format
 * Examples:
 *   "Ctrl+Shift+M" → "C(S(KC_M))"
 *   "Alt+H" → "A(KC_H)"
 *   "F3" → "KC_F3"
 *   "Shift+W" → "S(KC_W)"
 */
function humanToViaMacro(string $shortcut): ?string {
    global $keyMap;
    
    // Skip complex shortcuts with "or", "Hold", "click", etc.
    if (preg_match('/\b(or|Hold|click|LMB|RMB|Mouse|Drag|stylus|Space Bar)\b/i', $shortcut)) {
        return null;
    }
    
    // Parse modifiers and key
    $parts = preg_split('/\s*\+\s*/', trim($shortcut));
    if (empty($parts)) return null;
    
    $modifiers = [];
    $key = null;
    
    foreach ($parts as $part) {
        $part = trim($part);
        $lower = strtolower($part);
        
        if ($lower === 'ctrl' || $lower === 'cmd') {
            $modifiers[] = 'C';
        } elseif ($lower === 'shift') {
            $modifiers[] = 'S';
        } elseif ($lower === 'alt') {
            $modifiers[] = 'A';
        } else {
            // This is the key
            $key = $part;
        }
    }
    
    if ($key === null) return null;
    
    // Convert key to VIA format
    $viaKey = null;
    
    // Check direct mapping first
    if (isset($keyMap[$key])) {
        $viaKey = $keyMap[$key];
    }
    // Single letter
    elseif (preg_match('/^[A-Za-z]$/', $key)) {
        $viaKey = 'KC_' . strtoupper($key);
    }
    // Single digit
    elseif (preg_match('/^[0-9]$/', $key)) {
        $viaKey = 'KC_' . $key;
    }
    else {
        return null; // Unknown key
    }
    
    // Build the macro with modifiers
    if (empty($modifiers)) {
        return $viaKey;
    }
    
    // Sort modifiers for consistency: C, S, A order
    $modOrder = ['C' => 0, 'S' => 1, 'A' => 2];
    usort($modifiers, fn($a, $b) => $modOrder[$a] <=> $modOrder[$b]);
    
    // Check for combined modifier shortcuts
    // LSA = Left Shift + Alt
    // LCA = Left Ctrl + Alt
    // CSA or similar = Ctrl + Shift + Alt
    $hasCtrl = in_array('C', $modifiers);
    $hasShift = in_array('S', $modifiers);
    $hasAlt = in_array('A', $modifiers);
    
    // Use combined modifier codes where available
    if ($hasShift && $hasAlt && !$hasCtrl) {
        // Shift+Alt = LSA (Left Shift Alt)
        return "LSA({$viaKey})";
    }
    if ($hasCtrl && $hasAlt && !$hasShift) {
        // Ctrl+Alt = LCA (Left Ctrl Alt)
        return "LCA({$viaKey})";
    }
    
    // Nest modifiers from outside to inside
    $result = $viaKey;
    foreach (array_reverse($modifiers) as $mod) {
        $result = "{$mod}({$result})";
    }
    
    return $result;
}

// Rebelle keyboard shortcuts from the manual
// Format: [humanized_shortcut, label]
$rebelleShortcuts = [
    // Panels
    ['F3', 'Tools Panel'],
    ['F4', 'Properties Panel'],
    ['F8', 'Brushes Panel'],
    ['F6', 'Color Panel'],
    ['Ctrl+Shift+M', 'Mixing Palette'],
    ['Ctrl+K', 'Navigator'],
    ['Ctrl+Shift+W', 'Preview'],
    ['Ctrl+L', 'Tilt Panel'],
    ['F7', 'Layers Panel'],
    ['Shift+R', 'Rulers'],
    ['Ctrl+Shift+R', 'Reference Images'],
    ['Ctrl+R', 'Show/Hide Ref Images'],
    ['F10', 'Assets Panel'],
    ['Ctrl+J', 'Volume Presets'],
    ['F5', 'Brush Creator'],
    ['F12', 'Visual Settings'],
    ['Ctrl+Shift+T', 'Record Time-lapse'],
    
    // Files
    ['Ctrl+N', 'New'],
    ['Ctrl+O', 'Open'],
    ['Ctrl+S', 'Save'],
    ['Ctrl+Shift+S', 'Save As'],
    ['Ctrl+Alt+S', 'Iterative Save'],
    ['Ctrl+Shift+O', 'Import Image'],
    ['Ctrl+Shift+A', 'Import Assets'],
    ['Ctrl+,', 'Preferences'],
    ['Alt+Shift+K', 'Keyboard Shortcuts'],
    
    // Edit
    ['Ctrl+Z', 'Undo'],
    ['Ctrl+Shift+Z', 'Redo'],
    ['Ctrl+X', 'Cut'],
    ['Ctrl+C', 'Copy'],
    ['Ctrl+V', 'Paste'],
    
    // Tools
    ['Shift+W', 'Watercolors'],
    ['Shift+O', 'Oils & Acrylics'],
    ['Shift+A', 'Express Oils'],
    ['Shift+T', 'Pastels'],
    ['Shift+N', 'Pencils'],
    ['Shift+I', 'Inks'],
    ['Shift+M', 'Markers'],
    ['Shift+H', 'Airbrushes'],
    ['E', 'Eraser'],
    ['Shift+B', 'Favorite Brush'],
    ['B', 'Last Paint Brush'],
    ['Shift+E', 'Last Erase Brush'],
    ['N', 'Blend'],
    ['S', 'Smudge'],
    ['Shift+C', 'Clone Tool'],
    ['L', 'Fill'],
    ['I', 'Pick Color'],
    ['X', 'Mix Mode'],
    ['W', 'Water'],
    ['Y', 'Dry'],
    ['O', 'Blow'],
    ['M', 'Selection Tool'],
    ['T', 'Transform'],
    ['Ctrl+Alt+I', 'Image Size'],
    ['Ctrl+Alt+C', 'Canvas Size'],
    
    // Working with Brush Presets
    ['Ctrl+Shift+C', 'Copy Brush Preset'],
    ['Ctrl+Shift+V', 'Paste Brush Preset'],
    ['Ctrl+Shift+P', 'Duplicate/Save Brush Preset'],
    ['Ctrl+Shift+H', 'Reset Brush Changes'],
    ['Ctrl+Shift+B', 'Save Changes as Default'],
    
    // Favorite Brushes
    ['6', 'Brush Preset 1'],
    ['7', 'Brush Preset 2'],
    ['8', 'Brush Preset 3'],
    ['9', 'Brush Preset 4'],
    
    // Brushes & Painting
    [']', 'Increase Brush Size'],
    ['[', 'Decrease Brush Size'],
    ['Ctrl+]', 'Increase Brush Opacity'],
    ['Ctrl+[', 'Decrease Brush Opacity'],
    ["Ctrl+'", 'Increase Brush Water'],
    ['Ctrl+;', 'Decrease Brush Water'],
    ['Ctrl+Shift+]', 'Increase Brush Pressure'],
    ['Ctrl+Shift+[', 'Decrease Brush Pressure'],
    ['1', 'Paint Mode'],
    ['2', 'Paint & Mix'],
    ['3', 'Paint & Blend'],
    ['4', 'Blend Mode'],
    ['5', 'Erase Mode'],
    ['V', 'Switch Paint/Blend'],
    ['A', 'Switch Paint/Erase'],
    ['Alt+D', 'Dirty Brush'],
    ['Alt+M', 'MultiColored Brush'],
    
    // Working with Water
    ['H', 'Show Wet'],
    ['D', 'Pause Diffusion'],
    ['Shift+L', 'Wet the Layer'],
    ['Shift+V', 'Wet All Visible'],
    ['Shift+D', 'Dry the Layer'],
    ['F', 'Fast Dry'],
    ['Alt+T', 'Enable/Disable Canvas Tilt'],
    
    // Stencils
    ['Alt+Shift+N', 'Show/Hide Stencil'],
    
    // Selections
    ['Ctrl+Alt+R', 'Rectangle Selection'],
    ['Ctrl+Alt+E', 'Ellipse Selection'],
    ['Ctrl+Alt+P', 'Polygon Selection'],
    ['Ctrl+Alt+L', 'Freehand with Lines Selection'],
    ['Ctrl+Alt+F', 'Freehand Selection'],
    ['Ctrl+Alt+W', 'Magic Wand'],
    ['Q', 'Show/Hide Selection'],
    ['Alt+Q', 'Show/Hide Selection Lines'],
    ['Ctrl+Shift+I', 'Invert Selection'],
    ['Ctrl+A', 'Select All'],
    ['Ctrl+D', 'Deselect All'],
    ['Enter', 'Confirm'],
    ['Esc', 'Cancel'],
    ['Up', 'Move Up 1px'],
    ['Down', 'Move Down 1px'],
    ['Left', 'Move Left 1px'],
    ['Right', 'Move Right 1px'],
    ['Shift+Up', 'Move Up 10px'],
    ['Shift+Down', 'Move Down 10px'],
    ['Shift+Left', 'Move Left 10px'],
    ['Shift+Right', 'Move Right 10px'],
    
    // Layers & Groups
    ['Ctrl+Shift+N', 'New Layer'],
    ['Ctrl+Alt+G', 'New Group'],
    ['Ctrl+Shift+D', 'Duplicate Layer'],
    ['Ctrl+E', 'Merge Layers'],
    ['Alt+Shift+D', 'Remove Layer'],
    ['Ctrl+G', 'Group Layers'],
    ['Ctrl+Shift+G', 'Ungroup Layers'],
    ['Ctrl+Shift+E', 'Merge Visible'],
    ['Ctrl+Alt+A', 'Select All Layers'],
    ['Ctrl+.', 'Show/Hide Layer Group'],
    ['Del', 'Clear Layer'],
    ['Ctrl+/', 'Lock Layer'],
    ['/', 'Lock Layer Transparency'],
    ['Alt+-', 'Move Layers Up'],
    ['Alt+=', 'Move Layers Down'],
    ['Alt+[', 'Select Prev Layer'],
    ['Alt+]', 'Select Next Layer'],
    ['Alt+N', 'Rename Layer'],
    ['Alt+Shift+T', 'Tracing Layer'],
    
    // Sliders
    ['Pg Up', 'Increase Value +10'],
    ['Pg Down', 'Decrease Value -10'],
    
    // Color Filters
    ['Ctrl+M', 'Brightness/Contrast'],
    ['Ctrl+U', 'Hue/Saturation'],
    ['Ctrl+B', 'Color Balance'],
    ['Ctrl+Shift+F', 'Color Filter'],
    ['Ctrl+Shift+J', 'Colorize'],
    ['Ctrl+Shift+U', 'Desaturate'],
    ['Ctrl+I', 'Invert Colors'],
    
    // Color
    ['Alt+\\', 'System Color Dialog'],
    ['Ctrl+\\', 'Switch Primary/Secondary'],
    ['G', 'View Greyscale'],
    ['Alt+H', 'Increase Hue/Red'],
    ['Alt+Shift+H', 'Decrease Hue/Red'],
    ['Alt+S', 'Increase Saturation/Green'],
    ['Alt+Shift+S', 'Decrease Saturation/Green'],
    ['Alt+L', 'Increase Lightness/Blue'],
    ['Alt+Shift+L', 'Decrease Lightness/Blue'],
    ['Alt+W', 'Set Warmer Color'],
    ['Alt+C', 'Set Cooler Color'],
    ['C', 'Use Primary Color'],
    
    // Color Management
    ['Ctrl+Shift+K', 'Color Management'],
    ['Ctrl+Y', 'Proof Colors'],
    ['Ctrl+Shift+Y', 'Gamut Warning'],
    
    // View
    ['Ctrl++', 'Zoom In'],
    ['Ctrl+-', 'Zoom Out'],
    ['0', 'Zoom 100%'],
    ['.', 'Fit to Screen'],
    ['Ctrl+0', 'Fit to Screen'],
    ['R', 'Rotate Canvas'],
    ['Shift+G', 'Show Grid'],
    ['Shift+U', 'Show Guides'],
    ['Shift+Y', 'Show Ref Image on Canvas'],
    ['Ctrl+Shift+X', 'Show Cursor'],
    ['Ctrl+Alt+Left', 'Rotate CCW'],
    ['Ctrl+Alt+Right', 'Rotate CW'],
    ['Ctrl+Alt+0', 'Reset Rotation'],
    ['Shift+F', 'Flip Viewport'],
    ['Tab', 'Desktop/Tablet Mode'],
    
    // Other
    ['F1', 'Help'],
];

echo "// Rebelle 8 keyboard shortcuts - auto-generated from manual\n";
echo "// https://escapemotions.com/products/rebelle/manual/8/keyboard-shortcuts/\n\n";

$generated = [];
foreach ($rebelleShortcuts as [$shortcut, $label]) {
    $viaMacro = humanToViaMacro($shortcut);
    if ($viaMacro !== null) {
        // Avoid duplicates (keep first occurrence)
        if (!isset($generated[$viaMacro])) {
            $generated[$viaMacro] = $label;
            echo "    ['{$viaMacro}', '{$label}'],\n";
        }
    }
}

echo "\n// Total: " . count($generated) . " shortcuts converted\n";
