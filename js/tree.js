/* ============================================================
   tree.js  —  Upgrade Tree panel
   ============================================================
   Layout:
   - X axis = rank column (left to right, lowest to highest)
   - Y axis = one horizontal "lane" per root chain, sorted by ID
   - Children branch downward from their parent's lane
   - Connector lines: right-middle of parent → left-middle of child
   ============================================================ */

let treeData = [];
let byId     = {};

const NW = 120, NH = 42, H_GAP = 36, V_GAP = 36, PAD = 20, HEADER_H = 28;

function initTree(data) {
  treeData = data;
  data.forEach(r => { byId[r.id] = r; });

  const subtypes = [...new Set(data.map(r => r.subtype))].sort();
  const sel = document.getElementById('tree-sub');
  sel.innerHTML = subtypes.map(s => `<option value="${s}">${s}</option>`).join('');
  sel.addEventListener('change', renderTree);
}

function validParent(r) {
  const p = r.parent;
  if (!p || p === '-' || p === r.id || !byId[p]) return null;
  return p;
}

function renderTree() {
  const sub   = document.getElementById('tree-sub').value;
  const items = treeData
    .filter(r => r.subtype === sub)
    .sort((a, b) => a.id.localeCompare(b.id));

  const wrap = document.getElementById('tree-wrap');
  if (!items.length) {
    wrap.innerHTML = '<div class="no-data">No data for this subtype yet.</div>';
    return;
  }

  /* ---- Build children map (sorted by id) ---- */
  const children = {};
  items.forEach(r => {
    const pid = validParent(r);
    if (pid) {
      if (!children[pid]) children[pid] = [];
      children[pid].push(r.id);
    }
  });
  Object.values(children).forEach(arr => arr.sort((a, b) => a.localeCompare(b)));

  /* ---- Assign a lane (Y index) to every node via DFS ----
     Each root gets its own lane. Children that are the FIRST child
     of their parent share the parent's lane (continue the line).
     Every subsequent child gets a new lane below. */
  const lane = {};   // id → lane number (0-based)
  let   nextLane = 0;

  function assignLanes(id, myLane) {
    lane[id] = myLane;
    const kids = children[id] || [];
    kids.forEach((kid, i) => {
      if (i === 0) {
        // First child continues the same horizontal line
        assignLanes(kid, myLane);
      } else {
        // Extra children each get a fresh lane below
        assignLanes(kid, nextLane++);
      }
    });
  }

  const roots = items
    .filter(r => !validParent(r))
    .sort((a, b) => a.id.localeCompare(b.id));

  roots.forEach(r => {
    assignLanes(r.id, nextLane++);
  });

  /* ---- Rank → column X ---- */
  const ranks = [...new Set(items.map(r => r.rank))].sort((a, b) => a - b);
  const colX  = {};
  ranks.forEach((rk, i) => { colX[rk] = PAD + i * (NW + H_GAP); });

  /* ---- Node positions ---- */
  const pos = {};
  items.forEach(r => {
    pos[r.id] = {
      x: colX[r.rank],
      y: HEADER_H + PAD + lane[r.id] * (NH + V_GAP),
    };
  });

  /* ---- SVG dimensions ---- */
  const totalW = Math.max(...ranks.map(rk => colX[rk] + NW)) + PAD;
  const totalH = Math.max(...Object.values(pos).map(p => p.y + NH)) + PAD;

  /* ---- Rank column headers ---- */
  const headers = ranks.map(rk => `
    <text x="${colX[rk] + NW / 2}" y="16" text-anchor="middle"
          font-size="9" font-weight="600" letter-spacing="1"
          fill="var(--text3)" font-family="inherit">RANK ${rankLabel(rk)}</text>
    <line x1="${colX[rk]}" y1="${HEADER_H}"
          x2="${colX[rk] + NW}" y2="${HEADER_H}"
          stroke="var(--border)" stroke-width="0.5"/>
  `).join('');

  /* ---- Edges: right-middle → left-middle ---- */
  const edges = items.map(r => {
    const pid = validParent(r);
    if (!pid || !pos[pid] || !pos[r.id]) return '';
    const p = pos[pid], c = pos[r.id];
    const x1 = p.x + NW,    y1 = p.y + NH / 2;
    const x2 = c.x,         y2 = c.y + NH / 2;
    const mx = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"
                  fill="none" stroke="var(--border2)" stroke-width="1.2"/>`;
  }).join('');

  /* ---- Nodes ---- */
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
        <text x="${NW/2}" y="${NH/2 - 5}" text-anchor="middle" dominant-baseline="central"
              font-size="11" font-weight="600" fill="${col.text}" font-family="inherit">${lbl}</text>
        <text x="${NW/2}" y="${NH/2 + 9}" text-anchor="middle" dominant-baseline="central"
              font-size="9" fill="${col.text}" font-family="inherit" opacity=".6">Rank ${rankLabel(r.rank)}</text>
      </g>`;
  }).join('');

  wrap.innerHTML = `
    <svg width="${totalW}" height="${totalH}"
         xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:inherit">
      ${headers}
      ${edges}
      ${nodes}
    </svg>`;

  wrap.querySelectorAll('.tnode').forEach(el => {
    el.addEventListener('mouseenter', e => showTooltip(e, el.dataset.id));
    el.addEventListener('mousemove',  e => moveTooltip(e));
    el.addEventListener('mouseleave', hideTooltip);
  });
}
