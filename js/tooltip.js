/* ============================================================
   tooltip.js  —  Hover tooltip for the Upgrade Tree
   ============================================================ */

const ttEl = document.getElementById('tooltip');

function showTooltip(e, id) {
  const r = byId[id];
  if (!r) return;

  const parentName = (r.parent && r.parent !== '-' && r.parent !== r.id && byId[r.parent])
    ? byId[r.parent].name
    : '—';

  // Always show all four attributes, even if neutral
  const attrRows = ATTR_DEFS.map(({ icon, label, key }) => {
    const s = attrSymbol(r[key]);
    return `<div class="tt-row">
      <span class="tt-key">${icon} ${label}</span>
      <span class="tt-val ${s.cls}">${s.t}</span>
    </div>`;
  }).join('');

  const skillsHtml = r.skill && r.skill !== '-'
    ? `<div class="pill-wrap" style="margin-top:4px">${skillPills(r.skill)}</div>`
    : '<span style="font-size:11px;color:var(--text3)">—</span>';

  const matsHtml = r.materials && r.materials !== '-'
    ? `<div class="pill-wrap" style="margin-top:4px">${matPills(r.materials)}</div>`
    : '<span style="font-size:11px;color:var(--text3)">—</span>';

  ttEl.querySelector('.tt-box').innerHTML = `
    <div class="tt-name">${r.name}</div>
    <div class="tt-meta">Rank ${rankLabel(r.rank)} · ${r.type} · ${r.subtype}</div>

    <div class="tt-sep"></div>
    <div class="tt-lbl">Damage</div>
    <div class="tt-row"><span class="tt-key">Slash</span>  <span class="tt-val">${r.slash  || '—'}</span></div>
    <div class="tt-row"><span class="tt-key">Crush</span>  <span class="tt-val">${r.crush  || '—'}</span></div>
    <div class="tt-row"><span class="tt-key">Pierce</span> <span class="tt-val">${r.pierce || '—'}</span></div>

    <div class="tt-sep"></div>
    <div class="tt-lbl">Attribute</div>
    ${attrRows}

    <div class="tt-sep"></div>
    <div class="tt-lbl">Skills</div>
    ${skillsHtml}

    <div class="tt-sep"></div>
    <div class="tt-lbl">Craft</div>
    <div class="tt-cost">${r.cost ? r.cost.toLocaleString() + ' Fc' : 'Free'}</div>
    <div class="tt-row" style="margin-bottom:5px">
      <span class="tt-key">Upgrades from</span>
      <span class="tt-val" style="font-size:11px">${parentName}</span>
    </div>
    <div class="tt-lbl" style="margin-top:6px">Materials</div>
    ${matsHtml}
  `;

  ttEl.style.opacity = '1';
  moveTooltip(e);
}

function moveTooltip(e) {
  const box  = ttEl.querySelector('.tt-box');
  const W    = box.offsetWidth  || 230;
  const H    = box.offsetHeight || 300;
  let x = e.clientX + 16;
  let y = e.clientY + 16;
  if (x + W > window.innerWidth  - 8) x = e.clientX - W - 12;
  if (y + H > window.innerHeight - 8) y = e.clientY - H - 12;
  ttEl.style.left = x + 'px';
  ttEl.style.top  = y + 'px';
}

function hideTooltip() {
  ttEl.style.opacity = '0';
}
