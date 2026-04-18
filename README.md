# Household Budget App

A family budget tracker with Google Sheets sync, TD Bank CSV import, and AI-powered categorization.

## Features

- Manual transaction entry (add / edit / delete)
- Month-by-month navigation
- Monthly income/expense summary
- Stacked bar chart (expenses by category + income, last 6 months)
- Category breakdown with progress bars
- TD Bank CSV import with duplicate detection
- AI auto-categorization (Claude API)
- Auto-rule learning (keyword → category, or ignore)
- Google Sheets sync (Transactions sheet + Summary sheet)
- Offline-first — works without internet, sync when ready
- Multi-family: each household connects their own Google Sheet

---

## Setup

### 1. Deploy on GitHub Pages

1. Fork or clone this repo
2. Go to **Settings → Pages → Source: main branch / root**
3. Your app is live at `https://yourusername.github.io/budget-app/`

### 2. Create your Google Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it anything (e.g. "Family Budget 2026")

### 3. Deploy the GAS script

1. In your spreadsheet, go to **Extensions → Apps Script**
2. Delete the default code and paste the contents of `gas/Code.gs`
3. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and copy the Web App URL

### 4. Configure the app

1. Open your app URL
2. Click **⚙ Setup** in the top right
3. Paste your GAS Web App URL
4. Optionally add your Anthropic API key for AI categorization
5. Click **Save settings**

### 5. (Optional) Get an Anthropic API key

For AI auto-categorization of TD CSV imports:

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Paste it in the Setup modal

The key is stored only in your browser's local storage.

---

## TD Bank CSV Import

TD exports CSV with columns: `Date, Description, Debit, Credit, Balance`

The app:
1. Parses each row
2. Checks your saved rules (keyword match)
3. Ignores duplicates (same date + amount + store)
4. Sends unknowns to Claude for categorization (if API key is set)
5. Shows a preview — you can adjust categories before importing

---

## Auto-rules

Go to the **Auto-rules** tab to manage keyword rules:

- **Keyword**: partial match against CSV description (case-insensitive)
- **Category**: assign a category, or choose "Ignore" to skip the transaction

Rules are saved in your browser and applied automatically on every CSV import.

---

## Categories

| Category | Type |
|----------|------|
| Grocery | Expense |
| Rent | Expense |
| Household | Expense |
| Personal (Hiroki) | Expense |
| Personal (Haruka) | Expense |
| Internet | Expense |
| Car | Expense |
| Entertainment | Expense |
| Special Expense | Expense |
| Other Expense | Expense |
| Salary | Income |
| Other Income | Income |

---

## Google Sheets structure

After syncing, your spreadsheet will have two sheets:

**Transactions** — all transactions, sorted by date (newest first)

| ID | Date | Type | Amount | Store / Payee | Category | Memo |

**Summary** — category totals by month (like a pivot table)

| Category | 2025-06 | 2025-07 | ... |
|----------|---------|---------|-----|
| Grocery | 1483.41 | 1625.84 | ... |
| Rent | 3653.74 | 3675.89 | ... |
| ... | | | |
| Total Expense | 13273.07 | 9142.12 | ... |
| Total Income | 0 | 8889.27 | ... |

---

## Sharing with friends

Each person:
1. Creates their own Google Spreadsheet
2. Deploys the GAS script in their spreadsheet
3. Opens the app and enters their own GAS URL in Setup

Everyone uses the same app URL — data stays separate per household.
