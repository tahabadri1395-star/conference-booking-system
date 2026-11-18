// Colour themes, chosen per device. Each theme is a base (light or dark
// glass) plus a palette in index.css (:root[data-palette="…"]).
// `swatch` is what the picker shows: background, panel, accent.
export const THEMES = [
  { id: 'cream',      name: 'Cream',      base: 'light', swatch: ['#f6efe1', '#fffbf2', '#e2b57f'] },
  { id: 'pearl',      name: 'Pearl',      base: 'light', swatch: ['#eef4fb', '#ffffff', '#3b82f6'] },
  { id: 'sage',       name: 'Sage',       base: 'light', swatch: ['#eef3e6', '#fbfcf6', '#9cc49a'] },
  { id: 'lagoon',     name: 'Lagoon',     base: 'light', swatch: ['#e8f6f8', '#f8fdff', '#5cc4d9'] },
  { id: 'terracotta', name: 'Terracotta', base: 'light', swatch: ['#f8ebe1', '#fff8f3', '#e8956b'] },
  { id: 'stone',      name: 'Stone',      base: 'light', swatch: ['#f1f0ec', '#fdfdfb', '#1c1b19'] },
  { id: 'midnight',   name: 'Midnight',   base: 'dark',  swatch: ['#14284a', '#22324f', '#3b82f6'] },
  { id: 'emerald',    name: 'Emerald',    base: 'dark',  swatch: ['#0a2a1e', '#173a2d', '#10b981'] },
  { id: 'espresso',   name: 'Espresso',   base: 'dark',  swatch: ['#24170f', '#352619', '#d4a35a'] },
  { id: 'graphite',   name: 'Graphite',   base: 'dark',  swatch: ['#161618', '#2a2a2d', '#e7e5e4'] },
  { id: 'deepsea',    name: 'Deep Sea',   base: 'dark',  swatch: ['#08263a', '#143a4a', '#22d3ee'] },
]

export const THEME_KEY = 'roomsync-theme'
const DEFAULT = 'cream'
// Values saved before there were palettes.
const LEGACY = { light: 'cream', dark: 'midnight' }

export const themeById = id => THEMES.find(t => t.id === id) || THEMES[0]

export function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    const id = LEGACY[saved] || saved
    return THEMES.some(t => t.id === id) ? id : DEFAULT
  } catch {
    return DEFAULT
  }
}

export function applyTheme(id) {
  const theme = themeById(id)
  const root = document.documentElement
  root.setAttribute('data-theme', theme.base)
  if (theme.id === 'cream' || theme.id === 'midnight') root.removeAttribute('data-palette')
  else root.setAttribute('data-palette', theme.id)
  try { localStorage.setItem(THEME_KEY, theme.id) } catch { /* private mode */ }
}

// Design styles change shape, type, surfaces and depth (index.css,
// :root[data-style="…"]). They combine with any colour theme.
export const STYLES = [
  { id: 'glass',   name: 'Glass',   note: 'Frosted panels',     sample: 'Aa', font: 'Inter' },
  { id: 'atelier', name: 'Atelier', note: 'Editorial, refined', sample: 'Aa', font: 'Newsreader' },
  { id: 'bold',    name: 'Bold',    note: 'Outlines, hard shadows', sample: 'Aa', font: 'Space Grotesk' },
  { id: 'clay',    name: 'Clay',    note: 'Soft and raised',    sample: 'Aa', font: 'Nunito' },
  { id: 'grid',    name: 'Grid',    note: 'Swiss, square',      sample: 'Aa', font: 'Inter Tight' },
  { id: 'aurora',  name: 'Aurora',  note: 'Vivid, drifting',    sample: 'Aa', font: 'Inter' },
]

export const STYLE_KEY = 'roomsync-style'

export function readStyle() {
  try {
    const id = localStorage.getItem(STYLE_KEY)
    return STYLES.some(s => s.id === id) ? id : 'glass'
  } catch {
    return 'glass'
  }
}

export function applyStyle(id) {
  const root = document.documentElement
  if (id === 'glass') root.removeAttribute('data-style')
  else root.setAttribute('data-style', id)
  try { localStorage.setItem(STYLE_KEY, id) } catch { /* private mode */ }
}
