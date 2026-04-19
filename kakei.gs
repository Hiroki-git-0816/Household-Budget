// ============================================================
// Household Budget App — Google Apps Script
// Deploy as: Web App → Execute as Me → Anyone can access
// ============================================================

const SHEET_TRANSACTIONS = 'Transactions';
const SHEET_SUMMARY = 'Summary';
const SHEET_RULES = 'Rules';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'sync') {
      syncTransactions(data.transactions);
      updateSummary(data.summary);
      if (data.rules !== undefined) saveRulesToSheet(data.rules);
      return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  const callback = e && e.parameter && e.parameter.callback;

  if (action === 'pull') {
    const result = getPullData();
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + result + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  }

  const msg = JSON.stringify({ ok: true, message: 'Budget GAS is running' });
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + msg + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.JSON);
}

function getPullData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
    if (!sheet || sheet.getLastRow() <= 1) {
      return JSON.stringify({ ok: true, transactions: [] });
    }
    const lastRow = sheet.getLastRow();
    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const transactions = data
      .filter(r => r[0] !== '')
      .map(r => {
        // Normalize date to YYYY-MM-DD
        let d = r[1];
        if (d instanceof Date) {
          const y = d.getFullYear();
          const m = String(d.getMonth()+1).padStart(2,'0');
          const day = String(d.getDate()).padStart(2,'0');
          d = y+'-'+m+'-'+day;
        } else {
          d = String(d);
        }
        return {
          id: String(r[0]),
          date: d,
          type: String(r[2]),
          amount: parseFloat(r[3]) || 0,
          store: String(r[4]),
          category: String(r[5]),
          memo: String(r[6] || ''),
          deleted_at: String(r[7] || '')
        };
      });
    const rules = getRulesFromSheet();
    return JSON.stringify({ ok: true, transactions, rules });
  } catch(err) {
    return JSON.stringify({ ok: false, error: err.message });
  }
}

function syncTransactions(transactions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TRANSACTIONS);
    sheet.getRange(1, 1, 1, 8).setValues([['ID', 'Date', 'Type', 'Amount', 'Store / Payee', 'Category', 'Memo', 'Deleted At']]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#1a6b4a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 7).clearContent();

  if (transactions.length > 0) {
    const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    const rows = sorted.map(t => [t.id, t.date, t.type, t.amount, t.store, t.category, t.memo || '', t.deleted_at || '']);
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat('#,##0.00');
    sorted.forEach((t, i) => {
      const color = t.type === 'Income' ? '#e1f0e9' : '#fdf0e8';
      sheet.getRange(i + 2, 1, 1, 8).setBackground(color);
    });
  }
  
  sheet.autoResizeColumns(1, 8);
}

function updateSummary(summary) {
  if (!summary || !summary.months || !summary.rows) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SUMMARY);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SUMMARY);
  } else {
    sheet.clear();
  }

  const months = summary.months;
  const rows = summary.rows;
  const header = ['Category', ...months];
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#1a6b4a').setFontColor('#ffffff');

  const dataRows = rows.map(row => [row.category, ...months.map(m => row[m] || 0)]);
  if (dataRows.length > 0) {
    sheet.getRange(2, 1, dataRows.length, header.length).setValues(dataRows);
    sheet.getRange(2, 2, dataRows.length, months.length).setNumberFormat('#,##0.00');

    const totalExpRow = dataRows.findIndex(r => r[0] === 'Total Expense') + 2;
    const totalIncRow = dataRows.findIndex(r => r[0] === 'Total Income') + 2;

    for (let i = 0; i < dataRows.length - 2; i++) {
      sheet.getRange(i + 2, 1, 1, header.length).setBackground(i % 2 === 0 ? '#ffffff' : '#f7f6f2');
    }
    if (totalExpRow > 1) sheet.getRange(totalExpRow, 1, 1, header.length).setFontWeight('bold').setBackground('#fdf0e8');
    if (totalIncRow > 1) sheet.getRange(totalIncRow, 1, 1, header.length).setFontWeight('bold').setBackground('#e1f0e9');
  }

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  sheet.autoResizeColumns(1, header.length);
}

function getRulesFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RULES);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  return data.filter(r => r[0] !== '').map(r => ({ keyword: String(r[0]), category: String(r[1]) }));
}

function saveRulesToSheet(rules) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_RULES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RULES);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1a6b4a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([['keyword', 'category']]);
  if (rules.length > 0) {
    sheet.getRange(2, 1, rules.length, 2).setValues(rules.map(r => [r.keyword, r.category]));
    sheet.autoResizeColumns(1, 2);
  }
}
