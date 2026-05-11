/* ============================================================
   main.js  —  App entry point
   Loads all CSV data, then hands off to each panel module.
   ============================================================ */

// Tab switching
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.panel;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + name).classList.add('active');
    // Re-render tree when switching to it (needs correct dimensions)
    if (name === 'tree') renderTree();
  });
});

// Populate subtype filter from data
function populateSubtypeFilter(data) {
  const subtypes = [...new Set(data.map(r => r.subtype))].sort();
  const sel = document.getElementById('tbl-sub');
  const current = sel.value;
  sel.innerHTML = '<option value="">All subtypes</option>' +
    subtypes.map(s => `<option value="${s}"${s===current?' selected':''}>${s}</option>`).join('');
}

// Boot
(async () => {
  try {
    const data = await loadAllData();

    if (!data.length) {
      document.getElementById('data-status').textContent =
        'No data loaded. Make sure your CSV files are in the data/ folder.';
      return;
    }

    const count = data.length;
    const subtypes = [...new Set(data.map(r => r.subtype))];
    document.getElementById('data-status').textContent =
      `${count} equipment entries · ${subtypes.join(', ')}`;

    populateSubtypeFilter(data);
    initTable(data);
    initTree(data);
    initCompare(data);

  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('data-status').textContent =
      'Error loading data. See browser console for details.';
  }
})();
