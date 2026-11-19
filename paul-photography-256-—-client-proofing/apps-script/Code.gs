/**
 * Optional Zero-Server Google Apps Script Backend (Drive + Sheets + Gmail)
 * Deploy as Web App: Execute as "Me" | Who has access "Anyone"
 */
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
const SHEET_TAB_NAME = 'Selections';
const PHOTOGRAPHER_EMAIL = 'paulphotography256@gmail.com';

const SESSION_FOLDERS = {
  'kampala-editorial-2026': 'YOUR_GOOGLE_DRIVE_FOLDER_ID',
  'studio-portraits-2026': 'YOUR_STUDIO_DRIVE_FOLDER_ID',
};

function doGet(e) {
  const sessionId = (e.parameter && e.parameter.session) || 'kampala-editorial-2026';
  const folderId = (e.parameter && e.parameter.folderId) || SESSION_FOLDERS[sessionId];

  if (!folderId) {
    return jsonResponse({ error: 'Unknown session or folderId' });
  }

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const photos = [];

  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType().indexOf('image/') === 0) {
      const id = file.getId();
      photos.push({
        id: id,
        filename: file.getName(),
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1000',
        fullUrl: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w2400',
      });
    }
  }

  photos.sort((a, b) => a.filename.localeCompare(b.filename));

  return jsonResponse({
    sessionId: sessionId,
    sessionName: folder.getName(),
    photographerName: 'Paul Photography 256',
    shootDate: Utilities.formatDate(folder.getDateCreated(), 'Africa/Kampala', 'MMMM dd, yyyy'),
    source: 'drive',
    photos: photos,
  });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const submissionId = payload.submissionId || ('PP256-' + Date.now().toString(36).toUpperCase());
  const timestamp = new Date().toISOString();

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_TAB_NAME);
  const selected = payload.selectedPhotos || [];
  const filenames = selected.map((p) => p.filename).join(', ');
  const photoNotes = selected
    .filter((p) => p.note)
    .map((p) => p.filename + ': ' + p.note)
    .join(' | ');

  sheet.appendRow([
    timestamp,
    submissionId,
    payload.sessionId,
    payload.sessionName,
    payload.clientName,
    payload.clientEmail,
    selected.length,
    filenames,
    photoNotes || '—',
    payload.sessionNotes || '—',
  ]);

  const emailBody = [
    'Reference: ' + submissionId,
    'Client: ' + payload.clientName + ' (' + payload.clientEmail + ')',
    'Session: ' + payload.sessionName,
    '',
    'Selected Photos (' + selected.length + '):',
    ...selected.map((p, i) => (i + 1) + '. ' + p.filename + (p.note ? ' — ' + p.note : '')),
    '',
    'Session Notes: ' + (payload.sessionNotes || 'None'),
  ].join('\n');

  MailApp.sendEmail({
    to: PHOTOGRAPHER_EMAIL,
    replyTo: payload.clientEmail,
    subject: '[Favorites Selected] ' + payload.clientName + ' — ' + payload.sessionName,
    body: emailBody,
  });

  return jsonResponse({
    ok: true,
    submissionId: submissionId,
    timestamp: timestamp,
    loggedToSheets: true,
    emailSent: true,
    savedLocally: false,
    message: 'Selections logged to Google Sheets and emailed via Apps Script.',
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
