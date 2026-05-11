/* ============================================================
   compare.js  —  Equipment Compare panel
   ============================================================ */

let compareData = [];

function initCompare(data) {
  compareData = data.slice().sort((a, b) => a.name.localeCompare(b.name));
  populateSelects();
  document.getElementById('cmp-a').addEventListener('change', renderCompare);
  document.getElementById('cmp-b').addEventListener('change', renderCompare);
}

function populateSelects() {
  const opts = compareData.map(r =>
    `<option value="${r.id}">${r.name} (Rank ${rankLabel(r.rank)})</option>`
  ).join('');
  ['cmp-a', 'cmp-b'].forEach(id => {
    document.getElementById(id).innerHTML = '<option value="">Select weapon…</option>' + opts;
  });
}

function renderCompare() {
  const idA = document.getElementById('cmp-a').value;
  const idB = document.getElementById('cmp-b').value;
  const out = document.getElementById('cmp-out');

  if (!idA || !idB) {
    out.innerHTML = '<div class="no-data">Select two weapons to compare.</div>';
    return;
  }

  const a = byId[idA], b = byId[idB];
  if (!a || !b) return;

  function cmpCls(va, vb, higherBetter = true) {
    if (va === vb) return 'same';
    return (higherBetter ? va > vb : va < vb) ? 'better' : 'worse';
  }

  function buildCard(r, other) {
    const attrRows = ATTR_DEFS.map(({ icon, label, key }) => {
      const s = attrSymbol(r[key]);
      return `<div class="cmp-row">
        <span class="cmp-key">${icon} ${label}</span>
        <span class="${s.cls}">${s.t}</span>
      </div>`;
    }).join('');

    const totalA = r.slash + r.crush + r.pierce;
    const totalB = other.slash + other.crush + other.pierce;

    return `
      <div class="cmp-card">
        <div class="cmp-name">${r.name}</div>
        <div class="cmp-meta">Rank ${rankLabel(r.rank)} · ${r.subtype}</div>

        <div class="cmp-slbl">Damage</div>
        <div class="cmp-row"><span class="cmp-key">Slash</span>  <span class="${cmpCls(r.slash,  other.slash)}">${r.slash  || '—'}</span></div>
        <div class="cmp-row"><span class="cmp-key">Crush</span>  <span class="${cmpCls(r.crush,  other.crush)}">${r.crush  || '—'}</span></div>
        <div class="cmp-row"><span class="cmp-key">Pierce</span> <span class="${cmpCls(r.pierce, other.pierce)}">${r.pierce || '—'}</span></div>
        <div class="cmp-row"><span class="cmp-key">Total</span>  <span class="${cmpCls(totalA, totalB)}">${totalA}</span></div>

        <div class="cmp-slbl">Attribute</div>
        ${attrRows}

        <div class="cmp-slbl">Skills</div>
        <div class="pill-wrap">${skillPills(r.skill) || '<span style="color:var(--text3);font-size:11px">—</span>'}</div>

        <div class="cmp-slbl">Craft</div>
        <div class="cmp-row"><span class="cmp-key">Cost</span> <span class="${cmpCls(r.cost, other.cost, false)}">${r.cost ? r.cost.toLocaleString() + ' Fc' : '—'}</span></div>
        <div style="margin-top:6px"><div class="pill-wrap">${matPills(r.materials) || '<span style="color:var(--text3);font-size:11px">—</span>'}</div></div>
      </div>`;
  }

  out.className = 'cmp-grid';
  out.innerHTML = buildCard(a, b) + buildCard(b, a);
}
