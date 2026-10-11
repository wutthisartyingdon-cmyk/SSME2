const SPREADSHEET_ID = '1JO-5KX7i8fcjvcIG2C0OgdjC7Ul8tdlW85Uxp1QqvNs';
const SHEET_NAME = 'Signups';

function doGet() {
  return jsonResponse_({ ok: true, service: 'LIVVELL signup endpoint' });
}

function doPost(e) {
  try {
    const data = (e && e.parameter) || {};

    // Honeypot field: silently accept bot submissions without saving them.
    if (String(data.website || '').trim()) {
      return jsonResponse_({ ok: true });
    }

    const email = String(data.email || '').trim().toLowerCase();
    const name = safeCell_(data.name);
    const interest = data.interest === 'tester' ? 'tester' : 'updates';
    const device = interest === 'tester' ? safeCell_(data.device) : '';
    const consent = String(data.consent || '') === 'true';
    const consentVersion = safeCell_(data.consentVersion);
    const source = safeCell_(data.source || 'www.livvell.app');

    if (!isValidEmail_(email)) {
      return jsonResponse_({ ok: false, error: 'Please enter a valid email address.' });
    }
    if (!consent) {
      return jsonResponse_({ ok: false, error: 'Consent is required.' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error('Destination sheet not found.');
      sheet.appendRow([
        new Date(),
        safeCell_(email),
        name,
        interest,
        device,
        true,
        consentVersion,
        source,
      ]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: 'Unable to save your request. Please try again.' });
  }
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function safeCell_(value) {
  const text = String(value == null ? '' : value).trim().slice(0, 500);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
