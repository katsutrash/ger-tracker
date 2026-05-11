/* ============================================================
   table.js  —  Equipment Table panel
   ============================================================ */

let tableData = [];
let sortCol = 'id';
let sortDir = 0; // 0 = default (by id), 1 = asc, -1 = desc

function initTable(data) {
  tableData = data;

  // Attach click handlers to sortable headers
  document.querySelectorAll('#panel-table th.sortable').forEach(th => {
    th.addEventListener('click', () => cycleSort(th.dataset.col));
  });

  document.getElementById('tbl-search').addEventListener('input', renderTable);
  document.getElementById('tbl-sub').addEventListener('change', renderTable);
  document.getElementById('tbl-attr').addEventListener('change', renderTable);

  renderTable();
}

function cycleSort(col) {
  if (sortCol !== col) { sortCol = col; sortDir = 1; }
  else if (sortDir === 1) sortDir = -1;
  else { sortCol = 'id'; sortDir = 0; }
  renderTable();
}

function renderTable() {
  const q     = document.getElementById('tbl-search').value.toLowerCase();
  const fSub  = document.getElementById('tbl-sub').value;
  const fAttr = document.getElementById('tbl-attr').value;

  let rows = tableData.filter(r => {
    if (q && !(r.name + r.skill + r.materials + r.id).toLowerCase().includes(q)) return false;
    if (fSub  && r.subtype !== fSub) return false;
    if (fAttr === 'blaze'   && r.blaze  <= 0) return false;
    if (fAttr === 'freeze'  && r.freeze <= 0) return false;
    if (fAttr === 'spark'   && r.spark  <= 0) return false;
    if (fAttr === 'divine'  && r.divine <= 0) return false;
    if (fAttr === 'neutral' && (r.blaze || r.freeze || r.spark || r.divine)) return false;
    return true;
  });

  if (sortDir !== 0) {
    rows.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase();
      return sortDir * (va > vb ? 1 : va < vb ? -1 : 0);
    });
  }

  // Update sort indicator icons
  ['name','rank','slash','crush','pierce','cost'].forEach(c => {
    const el = document.getElementById('si-' + c);
    if (!el) return;
    const active = sortCol === c && sortDir !== 0;
    el.textContent = active ? (sortDir === 1 ? '▲' : '▼') : '↕';
    el.className = 'sort-icon' + (active ? (sortDir === 1 ? ' asc' : ' desc') : '');
  });

  document.getElementById('tbl-count').textContent = `${rows.length} / ${tableData.length}`;

  const tbody = document.getElementById('tbl-body');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="no-data">No results found.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="cell-name">${r.name}</td>
      <td class="cell-center"><span class="rank-badge">${rankLabel(r.rank)}</span></td>
      <td class="cell-num">${r.slash  || '—'}</td>
      <td class="cell-num">${r.crush  || '—'}</td>
      <td class="cell-num">${r.pierce || '—'}</td>
      <td class="cell-center">${attrHtml(r.blaze)}</td>
      <td class="cell-center">${attrHtml(r.freeze)}</td>
      <td class="cell-center">${attrHtml(r.spark)}</td>
      <td class="cell-center">${attrHtml(r.divine)}</td>
      <td><div class="pill-wrap">${skillPills(r.skill) || '<span style="color:var(--text3);font-size:11px">—</span>'}</div></td>
      <td class="cell-num" style="font-size:11px;font-family:monospace">${r.cost ? r.cost.toLocaleString() + ' Fc' : '—'}</td>
      <td><div class="pill-wrap">${matPills(r.materials) || '<span style="color:var(--text3);font-size:11px">—</span>'}</div></td>
    </tr>
  `).join('');
}
