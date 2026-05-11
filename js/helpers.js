/* ============================================================
   helpers.js  —  shared display helpers
   ============================================================ */

const ROMAN = ['P','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV'];
const rankLabel = r => ROMAN[r] ?? String(r);

const ATTR_DEFS = [
  { key: 'blaze',  icon: '🔥', label: 'Blaze'  },
  { key: 'freeze', icon: '❄',  label: 'Freeze' },
  { key: 'spark',  icon: '⚡', label: 'Spark'  },
  { key: 'divine', icon: '✦',  label: 'Divine' },
];

function attrSymbol(v) {
  if (v === -1) return { t: '✕',  cls: 'a-neg' };
  if (v ===  0) return { t: '—',  cls: 'a-neu' };
  if (v ===  1) return { t: '〇', cls: 'a-pos' };
  if (v ===  2) return { t: '〇〇', cls: 'a-dbl' };
  return { t: '—', cls: 'a-neu' };
}

function attrHtml(v) {
  const s = attrSymbol(v);
  return `<span class="${s.cls}">${s.t}</span>`;
}

function skillPills(s) {
  if (!s || s === '-') return '';
  return s.split(',').map(x =>
    `<span class="pill pill-skill">${x.trim()}</span>`
  ).join('');
}

function matPills(m) {
  if (!m || m === '-') return '';
  return m.split('|').map(p => {
    const [name, qty] = p.trim().split(':');
    return `<span class="pill pill-mat">${name.trim()}${qty ? `<span class="pill-qty"> ×${qty}</span>` : ''}</span>`;
  }).join('');
}

/* Node colour based on dominant attribute */
const NODE_COLORS = {
  blaze:   { fill: 'var(--blaze-bg)',   stroke: 'var(--blaze-bd)',   text: 'var(--blaze-tx)'   },
  freeze:  { fill: 'var(--freeze-bg)',  stroke: 'var(--freeze-bd)',  text: 'var(--freeze-tx)'  },
  spark:   { fill: 'var(--spark-bg)',   stroke: 'var(--spark-bd)',   text: 'var(--spark-tx)'   },
  divine:  { fill: 'var(--divine-bg)',  stroke: 'var(--divine-bd)',  text: 'var(--divine-tx)'  },
  neutral: { fill: 'var(--neutral-bg)', stroke: 'var(--neutral-bd)', text: 'var(--neutral-tx)' },
};

function nodeColor(r) {
  if (r.blaze  > 0) return NODE_COLORS.blaze;
  if (r.freeze > 0) return NODE_COLORS.freeze;
  if (r.spark  > 0) return NODE_COLORS.spark;
  if (r.divine > 0) return NODE_COLORS.divine;
  return NODE_COLORS.neutral;
}
