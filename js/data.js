/* ============================================================
   data.js  —  CSV loading + parsing
   ============================================================

   HOW TO UPDATE YOUR DATA
   -----------------------
   1. Open the file  data/GER_Melee.csv  in any spreadsheet app
      (Excel, LibreOffice Calc, Google Sheets).
   2. Add or edit rows.
   3. Save/export as CSV with the same filename.
   4. Refresh the browser — done!

   When you have more weapon types, add them to DATA_FILES below
   and create matching CSV files in the data/ folder.
   ============================================================ */

const DATA_FILES = [
  'data/GER_Melee.csv',
  // 'data/GER_Ranged.csv',   ← uncomment when ready
  // 'data/GER_Defense.csv',  ← uncomment when ready
];

/* Parse a CSV text string into an array of objects.
   Handles quoted fields (e.g. "Skill A, Skill B"). */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur); cur = ''; }
      else cur += ch;
    }
    values.push(cur);

    const row = {};
    headers.forEach((h, i) => row[h] = (values[i] ?? '').trim());

    // Cast numeric columns
    ['rank','slash','crush','pierce','blaze','freeze','spark','divine','cost']
      .forEach(k => row[k] = Number(row[k]) || 0);

    return row;
  }).filter(r => r.name); // skip blank/placeholder rows
}

/* Load all CSV files and return a merged array. */
async function loadAllData() {
  const results = await Promise.all(
    DATA_FILES.map(path =>
      fetch(path)
        .then(r => r.text())
        .then(parseCSV)
        .catch(err => {
          console.warn(`Could not load ${path}:`, err);
          return [];
        })
    )
  );
  return results.flat();
}
