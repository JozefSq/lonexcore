const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const https = require('https');
const os = require('os');

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.env.GOOGLE_CREDENTIALS_PATH),
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents'
  ]
});

async function getDriveFiles() {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });
  const res = await drive.files.list({
    pageSize: 20,
    fields: 'files(id, name, mimeType, webViewLink, size)'
  });
  return res.data.files;
}

async function listFolder(folderId = 'root') {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink)',
    pageSize: 25,
    orderBy: 'folder,name'
  });
  return res.data.files;
}

async function searchFiles(query) {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });
  const res = await drive.files.list({
    q: `name contains '${query}' and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink)',
    pageSize: 10
  });
  return res.data.files;
}

async function findFileByName(name) {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });
  const res = await drive.files.list({
    q: `name = '${name}' and trashed = false`,
    fields: 'files(id, name, webViewLink)'
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  return null;
}

async function getDownloadLink(fileId) {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });
  const res = await drive.files.get({ fileId, fields: 'webViewLink, webContentLink' });
  return res.data.webContentLink || res.data.webViewLink;
}

async function uploadFileFromUrl(url, fileName) {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });
  const tmpPath = path.join(os.tmpdir(), fileName);
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
  const res = await drive.files.create({
    requestBody: { name: fileName },
    media: { body: fs.createReadStream(tmpPath) },
    fields: 'id, name, webViewLink'
  });
  fs.unlinkSync(tmpPath);
  return res.data;
}

module.exports = {
  auth,
  getDriveFiles,
  listFolder,
  searchFiles,
  findFileByName,
  getDownloadLink,
  uploadFileFromUrl
};
