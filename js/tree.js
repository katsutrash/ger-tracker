/* ============================================================
   tree.js  —  Upgrade Tree panel
   ============================================================

   Layout rules:
   - X axis = rank (each distinct rank gets its own column)
   - Y axis = position within the column, sorted by equipment id
   - Children of the same parent are sorted by id
   - Connector lines run from the right-middle of parent
     to the left-middle of child (horizontal bezier curves)
   ============================================================ */

let treeData = [];
let byId     = {};

const NW = 120, NH = 42, H_GAP = 36, V_GAP = 16, PAD = 20, HEADER_H = 28;

function initTree(data) {
  treeData = data;
  data.forEach(r => { byId[r.id] = r; });

  // Populate subtype dropdown from actual data
  const subtypes = [...new Set(data.map(r => r.subtype))].sort();
  const sel = document.getElementById('tree-sub');
  sel.innerHTML = subtypes.map(s => `<option value="${s}">${s}</option>`).join('');
  sel.addEventListener('change', renderTree);
}

function renderTree() {
  const sub   = document.getElementById('tree-sub').value;
  const items = treeData
    .filter(r => r.subtype === sub)
    .sort((a, b) => a.id.localeCompare(b.id)); // sort by id throughout

  const wrap = document.getElementById('tree-wrap');

  if (!items.length) {
    wrap.innerHTML = '<div class="no-data">No data for this subtype yet.</div>';
    return;
  }

  // ---- Build parent→children map (sorted by id) ----
  const children = {}; // id → [child_id, ...]
  items.forEach(r => {
    const pid = validParent(r);
    if (pid) {
      if (!children[pid]) children[pid] = [];
      children[pid].push(r.id);
    }
  });
  // Sort each child list by id
  Object.values(children).forEach(arr => arr.sort((a, b) => a.localeCompare(b)));

  // ---- Group by rank ----
  const rankGroups = {};
  items.forEach(r => {
    if (!rankGroups[r.rank]) rankGroups[r.rank] = [];
    rankGroups[r.rank].push(r);
  });
  const ranks = Object.keys(rankGroups).map(Number).sort((a, b) => a - b);

  // ---- Assign column X per rank ----
  const colX = {};
  ranks.forEach((rk, i) => { colX[rk] = PAD + i * (NW + H_GAP); });

  // ---- Assign row Y per item using a topological DFS ----
  // We track how many slots are used in each rank column so far.
  const slotCount = {};
  ranks.forEach(rk => { slotCount[rk] = 0; });
  const pos = {}; // id → {x, y}

  const roots = items.filter(r => !validParent(r));

  function assignY(id) {
    if (pos[id]) return;
    const r = byId[id];
    const col = r.rank;
    const slot = slotCount[col]++;
    pos[id] = {
      x: colX[col],
      y: HEADER_H + PAD + slot * (NH + V_GAP),
    };
    // Recurse into children (already sorted by id)
    (children[id] || []).forEach(cid => assignY(cid));
  }

  // Visit roots in id order, then any unvisited items (disconnected)
  roots.forEach(r => assignY(r.id));
  items.forEach(r => { if (!pos[r.id]) assignY(r.id); });

  // ---- Compute SVG dimensions ----
  const totalW  = Math.max(...ranks.map(rk => colX[rk] + NW)) + PAD;
  const totalH  = Math.max(...Object.values(pos).map(p => p.y + NH)) + PAD;

  // ---- Build SVG ---- //

  // Rank column headers
  const headers = ranks.map(rk => {
    const cx = colX[rk] + NW / 2;
    return `
      <text x="${cx}" y="16" text-anchor="middle"
            font-size="9" font-weight="600" letter-spacing="1"
            fill="var(--text3)" font-family="inherit">RANK ${rankLabel(rk)}</text>
      <line x1="${colX[rk]}" y1="${HEADER_H}" x2="${colX[rk] + NW}" y2="${HEADER_H}"
            stroke="var(--border)" stroke-width="0.5"/>
    `;
  }).join('');

  // Edges: parent right-middle → child left-middle
  const edges = items.map(r => {
    const pid = validParent(r);
    if (!pid || !pos[pid] || !pos[r.id]) return '';
    const p = pos[pid], c = pos[r.id];
    const x1 = p.x + NW,        y1 = p.y + NH / 2;
    const x2 = c.x,             y2 = c.y + NH / 2;
    const mx = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"
                  fill="none" stroke="var(--border2)" stroke-width="1.2"/>`;
  }).join('');

  // Nodes
  const nodes = items.map(r => {
    if (!pos[r.id]) return '';
    const { x, y } = pos[r.id];
    const col = nodeColor(r);
    const lbl = r.name.length > 15 ? r.name.slice(0, 14) + '…' : r.name;
    const eid = JSON.stringify(r.id);
    return `
      <g class="tnode" data-id=${eid} style="cursor:pointer" transform="translate(${x},${y})">
        <rect width="${NW}" height="${NH}" rx="6"
              fill="${col.fill}" stroke="${col.stroke}" stroke-width="1"/>
        <text x="${NW / 2}" y="${NH / 2 - 5}" text-anchor="middle" dominant-baseline="central"
              font-size="11" font-weight="600" fill="${col.text}" font-family="inherit">${lbl}</text>
        <text x="${NW / 2}" y="${NH / 2 + 9}" text-anchor="middle" dominant-baseline="central"
              font-size="9" fill="${col.text}" font-family="inherit" opacity=".6">Rank ${rankLabel(r.rank)}</text>
      </g>`;
  }).join('');

  wrap.innerHTML = `
    <svg width="${totalW}" height="${totalH}"
         xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:inherit">
      ${headers}
      <g transform="translate(0,0)">${edges}${nodes}</g>
    </svg>`;

  // Attach tooltip events
  wrap.querySelectorAll('.tnode').forEach(el => {
    el.addEventListener('mouseenter', e => showTooltip(e, el.dataset.id));
    el.addEventListener('mousemove',  e => moveTooltip(e));
    el.addEventListener('mouseleave', hideTooltip);
  });
}

/* Returns the parent id only if it's a valid reference (not self, not '-') */
function validParent(r) {
  const p = r.parent;
  if (!p || p === '-' || p === r.id || !byId[p]) return null;
  return p;
}
