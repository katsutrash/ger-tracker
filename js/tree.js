/* ============================================================
   tree.js  —  Upgrade Tree panel
   ============================================================ */

let treeData = [];
let byId     = {};

const NW = 120, NH = 42, H_GAP = 36, V_GAP = 16, PAD = 20, HEADER_H = 28;
const FAMILY_GAP = 18; // extra vertical space between root families

function initTree(data) {
  treeData = data;
  data.forEach(r => { byId[r.id] = r; });

  const subtypes = [...new Set(data.map(r => r.subtype))].sort();
  const sel = document.getElementById('tree-sub');
  sel.innerHTML = subtypes.map(s => `<option value="${s}">${s}</option>`).join('');
  sel.addEventListener('change', () => { clearTreeSearch(); renderTree(); });

  document.getElementById('tree-search').addEventListener('input', onTreeSearch);
}

function validParent(r) {
  const p = r.parent;
  if (!p || p === '-' || p === r.id || !byId[p]) return null;
  return p;
}

/* Return all ancestor IDs of a given node */
function getAncestors(id) {
  const result = new Set();
  let cur = byId[id];
  while (cur) {
    const pid = validParent(cur);
    if (!pid) break;
    result.add(pid);
    cur = byId[pid];
  }
  return result;
}

/* Return all descendant IDs of a given node */
function getDescendants(id, childrenMap) {
  const result = new Set();
  function walk(nid) {
    (childrenMap[nid] || []).forEach(cid => { result.add(cid); walk(cid); });
  }
  walk(id);
  return result;
}

/* Return the root ancestor of a node (family root) */
function getFamilyRoot(id) {
  let cur = byId[id];
  while (cur) {
    const pid = validParent(cur);
    if (!pid) return cur.id;
    cur = byId[pid];
  }
  return id;
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

  /* ---- Children map ---- */
  const children = {};
  items.forEach(r => {
    const pid = validParent(r);
    if (pid) {
      if (!children[pid]) children[pid] = [];
      children[pid].push(r.id);
    }
  });
  Object.values(children).forEach(arr => arr.sort((a, b) => a.localeCompare(b)));

  /* ---- Lane assignment ---- */
  const lane       = {};
  const laneFamily = {}; // lane → family root id
  let   nextLane   = 0;
  let   familyIdx  = 0; // increments per root, used for padding

  const roots = items
    .filter(r => !validParent(r))
    .sort((a, b) => a.id.localeCompare(b.id));

  function assignLanes(id, myLane, familyRoot) {
    lane[id] = myLane;
    laneFamily[myLane] = familyRoot;
    const kids = children[id] || [];
    kids.forEach((kid, i) => {
      if (i === 0) {
        assignLanes(kid, myLane, familyRoot);
      } else {
        assignLanes(kid, nextLane++, familyRoot);
      }
    });
  }

  /* Count total lanes used by a subtree (to know how tall a family is) */
  function subtreeLanes(id) {
    const kids = children[id] || [];
    if (!kids.length) return 1;
    return kids.reduce((sum, kid) => sum + subtreeLanes(kid), 0);
  }

  /* Y offset per family root, adding FAMILY_GAP between families */
  const familyLaneStart = {}; // root id → first lane of this family
  let   laneOffset = 0;
  roots.forEach(r => {
    familyLaneStart[r.id] = laneOffset;
    nextLane = laneOffset;
    assignLanes(r.id, nextLane++, r.id);
    // nextLane now points past this family's first lane;
    // but branches inside may have pushed it further
    // recalc by counting
    const used = subtreeLanes(r.id);
    laneOffset = familyLaneStart[r.id] + used;
    familyIdx++;
  });

  /* ---- Rank → column X ---- */
  const ranks = [...new Set(items.map(r => r.rank))].sort((a, b) => a - b);
  const colX  = {};
  ranks.forEach((rk, i) => { colX[rk] = PAD + i * (NW + H_GAP); });

  /* ---- Node Y positions (with per-family padding) ---- */
  // For each lane, figure out which family it belongs to and add
  // accumulated family-gap offsets
  function laneToY(laneNum) {
    // Find which family this lane is in
    const rootId = laneFamily[laneNum];
    // Count how many family breaks happen before this lane
    let gapsBefore = 0;
    let l = 0;
    for (const r of roots) {
      if (r.id === rootId) break;
      const used = subtreeLanes(r.id);
      l += used;
      gapsBefore++;
    }
    return HEADER_H + PAD + laneNum * (NH + V_GAP) + gapsBefore * FAMILY_GAP;
  }

  const pos = {};
  items.forEach(r => {
    pos[r.id] = {
      x: colX[r.rank],
      y: laneToY(lane[r.id]),
    };
  });

  /* ---- SVG dimensions ---- */
  const totalW = Math.max(...ranks.map(rk => colX[rk] + NW)) + PAD;
  const totalH = Math.max(...Object.values(pos).map(p => p.y + NH)) + PAD;

  /* ---- Build SVG pieces ---- */
  const headers = ranks.map(rk => `
    <text x="${colX[rk] + NW / 2}" y="16" text-anchor="middle"
          font-size="9" font-weight="600" letter-spacing="1"
          fill="var(--text3)" font-family="inherit">RANK ${rankLabel(rk)}</text>
    <line x1="${colX[rk]}" y1="${HEADER_H}"
          x2="${colX[rk] + NW}" y2="${HEADER_H}"
          stroke="var(--border)" stroke-width="0.5"/>
  `).join('');

  const edges = items.map(r => {
    const pid = validParent(r);
    if (!pid || !pos[pid] || !pos[r.id]) return '';
    const p = pos[pid], c = pos[r.id];
    const x1 = p.x + NW, y1 = p.y + NH / 2;
    const x2 = c.x,      y2 = c.y + NH / 2;
    const mx = (x1 + x2) / 2;
    const fam = getFamilyRoot(r.id);
    return `<path class="edge" data-family="${fam}" data-child="${r.id}"
                  d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}"
                  fill="none" stroke="var(--border2)" stroke-width="1.2"
                  style="transition:opacity .2s"/>`;
  }).join('');

  const nodes = items.map(r => {
    if (!pos[r.id]) return '';
    const { x, y } = pos[r.id];
    const col = nodeColor(r);
    const lbl = r.name.length > 15 ? r.name.slice(0, 14) + '…' : r.name;
    const eid = JSON.stringify(r.id);
    const fam = getFamilyRoot(r.id);
    return `
      <g class="tnode" data-id=${eid} data-family="${fam}"
         style="cursor:pointer;transition:opacity .2s" transform="translate(${x},${y})">
        <rect width="${NW}" height="${NH}" rx="6"
              fill="${col.fill}" stroke="${col.stroke}" stroke-width="1"/>
        <text x="${NW/2}" y="${NH/2 - 5}" text-anchor="middle" dominant-baseline="central"
              font-size="11" font-weight="600" fill="${col.text}" font-family="inherit">${lbl}</text>
        <text x="${NW/2}" y="${NH/2 + 9}" text-anchor="middle" dominant-baseline="central"
              font-size="9" fill="${col.text}" font-family="inherit" opacity=".6">Rank ${rankLabel(r.rank)}</text>
      </g>`;
  }).join('');

  wrap.innerHTML = `
    <svg id="tree-svg" width="${totalW}" height="${totalH}"
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

  // Re-apply search highlight if there's an active query
  const q = document.getElementById('tree-search').value.trim().toLowerCase();
  if (q) applyTreeSearch(q);
}

/* ---- Search ---- */
function onTreeSearch() {
  const q = document.getElementById('tree-search').value.trim().toLowerCase();
  if (!q) { clearTreeSearch(); return; }
  applyTreeSearch(q);
}

function applyTreeSearch(q) {
  const sub   = document.getElementById('tree-sub').value;
  const items = treeData.filter(r => r.subtype === sub);

  // Find all nodes whose name matches
  const matched = items.filter(r => r.name.toLowerCase().includes(q));
  if (!matched.length) { clearTreeSearch(); return; }

  // Build children map for this subtype
  const children = {};
  items.forEach(r => {
    const pid = validParent(r);
    if (pid) { if (!children[pid]) children[pid] = []; children[pid].push(r.id); }
  });

  // For each match, collect the full chain: ancestors + self + descendants
  const highlighted = new Set();
  matched.forEach(r => {
    highlighted.add(r.id);
    getAncestors(r.id).forEach(id => highlighted.add(id));
    getDescendants(r.id, children).forEach(id => highlighted.add(id));
  });

  // Dim everything not in the highlighted set
  document.querySelectorAll('.tnode').forEach(el => {
    el.style.opacity = highlighted.has(el.dataset.id) ? '1' : '0.12';
  });
  document.querySelectorAll('.edge').forEach(el => {
    // Show edge if BOTH endpoints are highlighted
    const childId = el.dataset.child;
    const childR  = byId[childId];
    const pid     = childR ? validParent(childR) : null;
    const show    = highlighted.has(childId) && pid && highlighted.has(pid);
    el.style.opacity = show ? '1' : '0.08';
  });

  // Add a highlight ring to exact matches
  document.querySelectorAll('.tnode').forEach(el => {
    const rect = el.querySelector('rect');
    if (matched.some(r => r.id === el.dataset.id)) {
      rect.setAttribute('stroke-width', '2.5');
    } else {
      rect.setAttribute('stroke-width', '1');
    }
  });
}

function clearTreeSearch() {
  document.querySelectorAll('.tnode').forEach(el => {
    el.style.opacity = '1';
    el.querySelector('rect').setAttribute('stroke-width', '1');
  });
  document.querySelectorAll('.edge').forEach(el => { el.style.opacity = '1'; });
}
