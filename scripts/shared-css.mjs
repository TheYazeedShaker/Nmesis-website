// The page stylesheets come from one exported design and repeat many identical component,
// font and navigation rules. Hoisting those into the shared stylesheet lets browsers cache
// them once instead of downloading them again for every page type.

// Split CSS into top-level statements (whole @media/@supports blocks), dropping comments.
export function statements(css) {
  const out = [];
  let depth = 0, text = '', quote = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === '\\') { text += c + css[++i]; continue; } if (c === quote) quote = null; text += c; continue; }
    if (c === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i + 2); i = end < 0 ? css.length : end + 1; continue; }
    if (c === '"' || c === "'") quote = c;
    text += c;
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0 || c === ';' && depth === 0) { if (text.trim()) out.push(text.trim()); text = ''; }
  }
  if (text.trim()) out.push(text.trim());
  return out;
}

// Property families: a shorthand and its longhands (margin/margin-top) count as one.
const family = property => {
  if (property.startsWith('--')) return property;
  const name = property.replace(/^-(webkit|moz|ms)-/, '');
  if (/^(top|right|bottom|left|inset)/.test(name)) return 'inset';
  if (/^(align|justify|place)-/.test(name)) return 'place';
  if (/^(row-gap|column-gap|gap)$/.test(name)) return 'gap';
  if (/^(width|min-width|max-width|inline-size|min-inline-size|max-inline-size)$/.test(name)) return 'width';
  if (/^(height|min-height|max-height|block-size|min-block-size|max-block-size)$/.test(name)) return 'height';
  return name.split('-')[0];
};

const splitTopLevel = (text, separator) => {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && separator.test(c)) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
};

// The element a selector styles: the tag, id and classes its rightmost compound requires, and its pseudo-element.
function subject(selector) {
  const compound = splitTopLevel(selector, /[\s>+~]/).pop() || '';
  const pseudo = (compound.match(/::?(before|after|placeholder|selection|marker|backdrop)\b/) || [])[1] || '';
  const plain = compound.replace(/\[[^\]]*\]/g, '').replace(/:(not|is|where|has)\([^()]*\)/g, '').replace(/::?[\w-]+(\([^()]*\))?/g, '');
  return {
    pseudo,
    tag: (plain.match(/^[a-zA-Z][\w-]*/) || [])[0]?.toLowerCase() || '',
    id: (plain.match(/#(-?[_a-zA-Z][\w-]*)/) || [])[1] || '',
    classes: (plain.match(/\.-?[_a-zA-Z][\w-]*/g) || []).map(token => token.slice(1)),
  };
}

// Everything a statement can set: per subject, its property families.
function footprint(statement) {
  if (/^@font-face/i.test(statement)) {
    const d = name => (statement.match(new RegExp(`${name}\\s*:\\s*([^;}]+)`, 'i')) || [])[1]?.trim() || '';
    return {keys: [`@font-face ${d('font-family')} ${d('font-weight')} ${d('font-style')} ${d('unicode-range')}`], targets: []};
  }
  if (/^@keyframes/i.test(statement)) return {keys: [statement.slice(0, statement.indexOf('{')).trim()], targets: []};
  if (!statement.includes('{')) return {keys: [statement], targets: []};
  const targets = [];
  for (const [, selectors, block] of statement.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if (/^\s*@/.test(selectors)) continue;
    const families = new Set(block.split(';').filter(d => d.includes(':')).map(d => family(d.split(':')[0].trim().toLowerCase())));
    for (const selector of splitTopLevel(selectors.replace(/^[^{]*@[^{]*\{/, ''), /,/)) targets.push({...subject(selector), families});
  }
  return {keys: [], targets};
}

// A rule moves into the shared stylesheet only if it appears in every page stylesheet and
// nothing that stays behind it in any page could style the same element with an overlapping
// property; moving it earlier then cannot change which declaration wins. Elements are known
// from the built pages (`elements`: tag, id and classes), and `dynamic` classes added by scripts are
// assumed to be present anywhere. Repeated identical statements keep only their last occurrence.
export function splitSharedCss(pages, {elements = null, dynamic = []} = {}) {
  const lists = Object.fromEntries(Object.entries(pages).map(([name, css]) => {
    const all = statements(css), seen = new Set(), kept = [];
    for (let i = all.length - 1; i >= 0; i--) if (!seen.has(all[i])) { seen.add(all[i]); kept.unshift(all[i]); }
    return [name, kept];
  }));
  const names = Object.keys(lists);
  const counts = new Map();
  for (const list of Object.values(lists)) for (const s of list) counts.set(s, (counts.get(s) || 0) + 1);
  const prints = new Map();
  const print = s => { if (!prints.has(s)) prints.set(s, footprint(s)); return prints.get(s); };
  const dynamicClasses = new Set(dynamic);
  const index = new Map();
  const add = (key, i) => { if (!index.has(key)) index.set(key, []); index.get(key).push(i); };
  (elements || []).forEach((element, i) => { add('tag:' + element.tag, i); if (element.id) add('id:' + element.id, i); for (const name of element.classes) add('class:' + name, i); });
  const memo = new Map();
  // Whether any built element could be the subject of both selectors at once.
  const canShareElement = (a, b) => {
    if (a.tag && b.tag && a.tag !== b.tag || a.id && b.id && a.id !== b.id) return false;
    if (!elements) return true;
    const tag = a.tag || b.tag, id = a.id || b.id;
    const classes = [...new Set([...a.classes, ...b.classes])].filter(name => !dynamicClasses.has(name)).sort();
    if (!tag && !id && !classes.length) return true;
    const key = `${tag}#${id}.${classes.join('.')}`;
    if (!memo.has(key)) {
      const lists = [...(tag ? ['tag:' + tag] : []), ...(id ? ['id:' + id] : []), ...classes.map(name => 'class:' + name)].map(k => index.get(k) || []);
      const smallest = lists.reduce((x, y) => x.length <= y.length ? x : y);
      memo.set(key, smallest.some(i => { const element = elements[i]; return (!tag || element.tag === tag) && (!id || element.id === id) && classes.every(name => element.classes.has(name)); }));
    }
    return memo.get(key);
  };
  const conflicts = (a, b) => {
    const pa = print(a), pb = print(b);
    if (pa.keys.some(key => pb.keys.includes(key))) return true;
    return pa.targets.some(ta => pb.targets.some(tb => ta.pseudo === tb.pseudo && [...ta.families].some(f => tb.families.has(f)) && canShareElement(ta, tb)));
  };
  const shared = new Set([...counts].filter(([, n]) => n === names.length).map(([s]) => s));
  // A blocked rule stays in its page file like a page-specific rule, which can in turn block
  // later shared rules, so repeat until no new rule is blocked.
  const blocked = new Set();
  for (let changed = true; changed;) {
    changed = false;
    for (const list of Object.values(lists)) {
      const behind = [];
      for (const s of list) {
        if (shared.has(s) && !blocked.has(s) && behind.some(p => conflicts(p, s))) { blocked.add(s); changed = true; }
        if (!shared.has(s) || blocked.has(s)) behind.push(s);
      }
    }
  }
  const hoisted = new Set([...shared].filter(s => !blocked.has(s)));
  // Hoisted rules keep their shared relative order.
  const common = lists[names[0]].filter(s => hoisted.has(s));
  const rest = Object.fromEntries(names.map(name => [name, lists[name].filter(s => !hoisted.has(s)).join('\n')]));
  return {common: common.join('\n'), pages: rest, hoisted: hoisted.size, blocked: blocked.size};
}
