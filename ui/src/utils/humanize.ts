/**
 * Humanize VIA/QMK macro strings to human-readable format
 * Examples:
 *   KC_2 → 2
 *   C(KC_EQL) → Ctrl+=
 *   C(S(KC_P)) → Ctrl+Shift+P
 *   LSA(KC_L) → Shift+Alt+L
 *   TO(3) → Layer 4
 */

// Key name mappings
const KEY_MAP: Record<string, string> = {
  // Numbers are handled by stripping KC_ prefix
  // Letters are handled by stripping KC_ prefix
  
  // Special keys
  'ESC': 'Esc',
  'TAB': 'Tab',
  'ENTER': 'Enter',
  'ENT': 'Enter',
  'SPACE': 'Space',
  'SPC': 'Space',
  'BSPC': 'Backspace',
  'DEL': 'Delete',
  'INS': 'Insert',
  'HOME': 'Home',
  'END': 'End',
  'PGUP': 'PageUp',
  'PGDN': 'PageDown',
  'CAPS': 'CapsLock',
  'PSCR': 'PrintScreen',
  'SLCK': 'ScrollLock',
  'PAUS': 'Pause',
  'APP': 'Menu',
  
  // Arrow keys
  'UP': '↑',
  'DOWN': '↓',
  'LEFT': '←',
  'RIGHT': '→',
  
  // Symbols
  'MINUS': '-',
  'MINS': '-',
  'EQUAL': '=',
  'EQL': '=',
  'LBRC': '[',
  'RBRC': ']',
  'BSLS': '\\',
  'SCLN': ';',
  'QUOT': "'",
  'GRV': '`',
  'GRAVE': '`',
  'COMM': ',',
  'DOT': '.',
  'SLSH': '/',
  'TILD': '~',
  'TILDE': '~',
  'EXLM': '!',
  'AT': '@',
  'HASH': '#',
  'DLR': '$',
  'PERC': '%',
  'CIRC': '^',
  'AMPR': '&',
  'ASTR': '*',
  'LPRN': '(',
  'RPRN': ')',
  'UNDS': '_',
  'PLUS': '+',
  'LCBR': '{',
  'RCBR': '}',
  'PIPE': '|',
  'COLN': ':',
  'DQUO': '"',
  'LABK': '<',
  'RABK': '>',
  'QUES': '?',
  
  // Function keys
  'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
  'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
  'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
  'F13': 'F13', 'F14': 'F14', 'F15': 'F15', 'F16': 'F16',
  'F17': 'F17', 'F18': 'F18', 'F19': 'F19', 'F20': 'F20',
  
  // Modifiers (standalone)
  'LCTL': 'Left Ctrl',
  'RCTL': 'Right Ctrl',
  'LSFT': 'Left Shift',
  'RSFT': 'Right Shift',
  'LALT': 'Left Alt',
  'RALT': 'Right Alt',
  'LGUI': 'Left Cmd',
  'RGUI': 'Right Cmd',
  'LWIN': 'Left Win',
  'RWIN': 'Right Win',
  
  // Numpad
  'P0': 'Num 0', 'P1': 'Num 1', 'P2': 'Num 2', 'P3': 'Num 3',
  'P4': 'Num 4', 'P5': 'Num 5', 'P6': 'Num 6', 'P7': 'Num 7',
  'P8': 'Num 8', 'P9': 'Num 9',
  'PDOT': 'Num .',
  'PENT': 'Num Enter',
  'PPLS': 'Num +',
  'PMNS': 'Num -',
  'PAST': 'Num *',
  'PSLS': 'Num /',
  'NLCK': 'NumLock',
  
  // Media
  'MUTE': 'Mute',
  'VOLU': 'Vol Up',
  'VOLD': 'Vol Down',
  'MPLY': 'Play/Pause',
  'MSTP': 'Stop',
  'MPRV': 'Prev Track',
  'MNXT': 'Next Track',
  
  // No operation
  'NO': '',
  'TRNS': '▽',
}

// Modifier display names
const MOD_MAP: Record<string, string> = {
  'C': 'Ctrl',
  'S': 'Shift',
  'A': 'Alt',
  'G': 'Cmd',
}

// Modifier sort order: Ctrl, Alt, Shift, Cmd
const MOD_ORDER: Record<string, number> = {
  'C': 1,
  'A': 2,
  'S': 3,
  'G': 4,
}

/**
 * Convert a VIA/QMK macro string to human-readable format
 */
export function humanize(macro: string): string | null {
  const m = macro.trim().replace(/\s+/g, '')
  if (m === '' || m.toUpperCase() === 'KC_NO') return null
  
  // Layer switching: TO(n) - display as 1-indexed
  const layerMatch = m.match(/^TO\((\d+)\)$/i)
  if (layerMatch) {
    return `Layer ${parseInt(layerMatch[1], 10) + 1}`
  }
  
  // Momentary layer: MO(n)
  const moMatch = m.match(/^MO\((\d+)\)$/i)
  if (moMatch) {
    return `Hold Layer ${parseInt(moMatch[1], 10) + 1}`
  }
  
  // Toggle layer: TG(n)
  const tgMatch = m.match(/^TG\((\d+)\)$/i)
  if (tgMatch) {
    return `Toggle Layer ${parseInt(tgMatch[1], 10) + 1}`
  }
  
  // One-shot layer: OSL(n)
  const oslMatch = m.match(/^OSL\((\d+)\)$/i)
  if (oslMatch) {
    return `One-shot Layer ${parseInt(oslMatch[1], 10) + 1}`
  }
  
  // Parse modifiers
  const mods: string[] = []
  let remaining = m
  
  while (true) {
    // Combined modifiers like LSA(...), RSA(...), LCA(...), LCAG(...)
    // L/R prefix is optional, then 2+ modifier chars
    const combinedMatch = remaining.match(/^[LR]?((?:C|S|A|G){2,})\((.+)\)$/)
    if (combinedMatch) {
      const group = combinedMatch[1]
      for (const ch of group) {
        if (!mods.includes(ch)) mods.push(ch)
      }
      remaining = combinedMatch[2]
      continue
    }
    
    // Single modifier like C(...), S(...), with optional L/R prefix
    const singleMatch = remaining.match(/^[LR]?(C|S|A|G)\((.+)\)$/)
    if (singleMatch) {
      const mod = singleMatch[1]
      if (!mods.includes(mod)) mods.push(mod)
      remaining = singleMatch[2]
      continue
    }
    
    break
  }
  
  // Get base key
  let baseKey = remaining
  if (baseKey.startsWith('KC_')) {
    baseKey = baseKey.substring(3)
  }
  
  // Look up key name
  const baseUpper = baseKey.toUpperCase()
  let displayKey = KEY_MAP[baseUpper]
  
  if (displayKey === undefined) {
    // Single character keys (letters, numbers)
    if (baseKey.length === 1) {
      displayKey = baseKey.toUpperCase()
    } else {
      // Unknown key, display as-is
      displayKey = baseKey
    }
  }
  
  // Empty key (KC_NO)
  if (displayKey === '') return null
  
  // Sort modifiers and build prefix
  mods.sort((a, b) => (MOD_ORDER[a] ?? 99) - (MOD_ORDER[b] ?? 99))
  const modNames = mods.map(m => MOD_MAP[m] ?? m)
  
  if (modNames.length > 0) {
    return modNames.join('+') + '+' + displayKey
  }
  
  return displayKey
}

export default humanize
