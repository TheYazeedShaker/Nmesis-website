// Shared action content keeps service controls aligned with project/contact motion.
// The duplicate label and arrow are decorative, so accessible names stay singular.
export function serviceLabel(text, escape) {
  return `<span class="svc-button-label"><span>${escape(text)}</span><span aria-hidden="true">${escape(text)}</span></span>`;
}

export function serviceArrow(direction = '↗') {
  const symbol = direction === '↘' ? '↘' : '↗';
  return `<span class="svc-action-arrow${symbol === '↘' ? ' svc-action-arrow--down' : ''}" aria-hidden="true"><span>${symbol}</span><span>${symbol}</span></span>`;
}

export function serviceActionContent(text, escape, direction = '↗') {
  return `${serviceLabel(text, escape)}${serviceArrow(direction)}`;
}
