const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_PATH = path.join(__dirname, 'gdrive_config.json');
const DEFAULT_FOLDER_ID = '1hfpxSnI4AtbHV9MPtnEkIVAoII1VP0g7';
const DEFAULT_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_FOLDER_ID}`;
const SERVICE_ACCOUNT_FILE = path.join(__dirname, 'service_account.json');
const GOOGLE_CREDS_FILE = path.join(__dirname, 'google_credentials.json');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let cachedAccessToken = null;
let tokenExpiresAt = 0;

function getGdriveConfig() {
  const config = {
    folder_id: DEFAULT_FOLDER_ID,
    folder_url: DEFAULT_FOLDER_URL,
    service_account_file: 'service_account.json',
    webhook_url: process.env.GOOGLE_DRIVE_WEBHOOK_URL || ''
  };
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      Object.assign(config, saved);
    } catch (e) {
      console.error('Error reading gdrive_config.json:', e);
    }
  }
  return config;
}

function saveGdriveConfig(updates) {
  const current = getGdriveConfig();
  Object.assign(current, updates);
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving gdrive_config.json:', e);
  }
}

function getTargetFolderId() {
  return getGdriveConfig().folder_id || DEFAULT_FOLDER_ID;
}

function getTargetFolderUrl() {
  const cfg = getGdriveConfig();
  return cfg.folder_url || `https://drive.google.com/drive/folders/${cfg.folder_id || DEFAULT_FOLDER_ID}`;
}

function getServiceAccountCredentials() {
  const tryFiles = [SERVICE_ACCOUNT_FILE, GOOGLE_CREDS_FILE];
  for (const f of tryFiles) {
    if (fs.existsSync(f)) {
      try {
        const sa = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (sa.client_email && sa.private_key) {
          return {
            client_email: sa.client_email,
            private_key: sa.private_key,
            project_id: sa.project_id || ''
          };
        }
      } catch (e) {}
    }
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    let pk = process.env.GOOGLE_PRIVATE_KEY;
    if (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
    return {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: pk,
      project_id: process.env.GOOGLE_PROJECT_ID || ''
    };
  }

  return null;
}

function getServiceAccountInfo() {
  const creds = getServiceAccountCredentials();
  if (creds) {
    return {
      configured: true,
      client_email: creds.client_email,
      project_id: creds.project_id
    };
  }
  const cfg = getGdriveConfig();
  if (cfg.webhook_url) {
    return {
      configured: true,
      client_email: 'Google Apps Script Webhook',
      project_id: 'GAS Webhook'
    };
  }
  return { configured: false };
}

/**
 * Native token generation for Google Service Account using RS256 JWT
 */
async function getServiceAccountAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && tokenExpiresAt > now + 60) {
    return cachedAccessToken;
  }

  const creds = getServiceAccountCredentials();
  if (!creds) return null;

  try {
    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const jwtClaim = Buffer.from(
      JSON.stringify({
        iss: creds.client_email,
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      })
    ).toString('base64url');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${jwtHeader}.${jwtClaim}`);
    const signature = signer.sign(creds.private_key, 'base64url');
    const assertion = `${jwtHeader}.${jwtClaim}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Google OAuth error: ${data.error_description || data.error || 'Failed to exchange token'}`);
    }

    cachedAccessToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in || 3600);
    return cachedAccessToken;
  } catch (err) {
    console.error('[GoogleDrive] Access token exchange failed:', err.message);
    return null;
  }
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._\-а-яА-ЯёЁ]/g, '_');
}

/**
 * Upload to Google Drive using native multipart REST API (Service Account)
 */
async function uploadToGdriveServiceAccount(filePath, fileName, mimeType = 'application/octet-stream') {
  const token = await getServiceAccountAccessToken();
  if (!token) return null;

  try {
    const folderId = getTargetFolderId();
    const metadata = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream'
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const fileContent = fs.readFileSync(filePath);
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody = Buffer.concat([
      Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter),
      Buffer.from(`Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`),
      fileContent,
      Buffer.from(closeDelimiter)
    ]);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(multipartRequestBody.length)
        },
        body: multipartRequestBody
      }
    );

    const fileData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(`Google Drive upload failed: ${fileData.error ? fileData.error.message : JSON.stringify(fileData)}`);
    }

    const fileId = fileData.id;

    // Grant public read permissions so preview/direct view link works
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      });
    } catch (permErr) {}

    const directLink = `https://drive.google.com/uc?export=view&id=${fileId}`;
    const webLink = fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return {
      file_id: fileId,
      web_link: webLink,
      direct_link: directLink,
      name: fileData.name
    };
  } catch (e) {
    console.error('[GoogleDrive] Error uploading via Service Account:', e.message);
    return null;
  }
}

/**
 * Upload to Google Drive using Apps Script Webhook
 */
async function uploadToGdriveWebhook(fileBuffer, fileName, mimeType = 'application/octet-stream') {
  const cfg = getGdriveConfig();
  if (!cfg.webhook_url) return null;

  try {
    const base64Data = fileBuffer.toString('base64');
    const payload = {
      filename: fileName,
      mimeType,
      fileData: base64Data,
      folderId: getTargetFolderId()
    };
    const response = await fetch(cfg.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const result = await response.json();
      if (result && result.web_link) {
        return result;
      }
      if (result && result.file_id) {
        return {
          file_id: result.file_id,
          web_link: result.web_link || `https://drive.google.com/file/d/${result.file_id}/view`,
          direct_link: `https://drive.google.com/uc?export=view&id=${result.file_id}`
        };
      }
    }
  } catch (e) {
    console.error('[GoogleDrive] Error uploading via Google Apps Script Webhook:', e.message);
  }
  return null;
}

/**
 * Uploads a file, synchronizes it to Google Drive, and immediately deletes
 * the local temporary file from server memory/disk if Google Drive succeeded!
 */
async function uploadAndCleanupLocal(filePath, originalFilename, mimeType = 'application/octet-stream') {
  const cleanName = sanitizeFilename(originalFilename);
  let gdriveRes = null;

  // 1. Try Service Account (native)
  if (getServiceAccountCredentials()) {
    gdriveRes = await uploadToGdriveServiceAccount(filePath, cleanName, mimeType);
  }

  // 2. Try Webhook if Service Account not configured or failed
  if (!gdriveRes) {
    const cfg = getGdriveConfig();
    if (cfg.webhook_url && fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      gdriveRes = await uploadToGdriveWebhook(buffer, cleanName, mimeType);
    }
  }

  if (gdriveRes && (gdriveRes.web_link || gdriveRes.direct_link)) {
    const finalLink = gdriveRes.web_link || gdriveRes.direct_link;
    console.log(`[GoogleDrive] ✅ Файл «${cleanName}» выгружен на Google Диск: ${finalLink}`);

    // DELETE local file from server disk to save space!
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[GoogleDrive] 🧹 Локальный файл удален с сервера (${filePath}). Память не засоряется.`);
      }
    } catch (delErr) {
      console.warn('[GoogleDrive] Could not delete local temp file:', delErr.message);
    }

    return {
      fileLink: finalLink,
      fileName: cleanName,
      isGoogleDrive: true,
      gdriveRes
    };
  }

  // Fallback: Google Drive not configured, keep file locally
  console.log(`[GoogleDrive] ℹ️ Google Drive не настроен или недоступен. Файл оставлен локально: ${filePath}`);
  const filename = path.basename(filePath);
  return {
    fileLink: '/uploads/' + filename,
    fileName: cleanName,
    isGoogleDrive: false,
    gdriveRes: null
  };
}

function getAppsScriptTemplate() {
  const folderId = getTargetFolderId();
  return `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = data.folderId || "${folderId}";
    var folder = DriveApp.getFolderById(folderId);
    
    var decoded = Utilities.base64Decode(data.fileData);
    var blob = Utilities.newBlob(decoded, data.mimeType, data.filename);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      file_id: file.getId(),
      web_link: file.getUrl(),
      direct_link: "https://drive.google.com/uc?export=view&id=" + file.getId(),
      name: file.getName()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
}

module.exports = {
  getGdriveConfig,
  saveGdriveConfig,
  getTargetFolderId,
  getTargetFolderUrl,
  getServiceAccountInfo,
  uploadAndCleanupLocal,
  uploadToGdriveServiceAccount,
  uploadToGdriveWebhook,
  getAppsScriptTemplate,
  SERVICE_ACCOUNT_FILE,
  UPLOADS_DIR
};
