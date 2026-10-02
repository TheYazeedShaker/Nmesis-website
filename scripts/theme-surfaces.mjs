// The imported layout used the same white/ink tokens for surfaces and lettering.
// Give background declarations their own tokens without changing light values.
export function themeSurfaces(source) {
  return source.replace(/\b(background(?:-color|-image)?\s*:[^;"{}]+)/g, declaration => declaration
    .replaceAll('var(--color-white,','var(--surface-card,')
    .replaceAll('var(--color-ink,','var(--surface-deep,'));
}
