# Client Photo Proofing & Favorites — Integration Guide

## 1. Instant Local Preview
By default (`VITE_USE_MOCK_DATA=true`), the gallery loads sample proofing sessions locally so you can immediately browse masonry/grid layouts, zoom in the lightbox, toggle favorites, add per-photo notes, and submit selections.

Even in preview mode, clicking **Submit Selections** sends a real `POST /api/favorites` request to the Express backend (`server.ts`), which validates the submission, saves a structured record in `.data/submissions.json`, and—once configured—forwards to Google Sheets and emails the photographer.

---

## 2. Embedding into `paulphotography256.com`
Copy `src/components/`, `src/services/`, `src/types/`, and `src/index.css` into your portfolio site, then mount `<ProofingGallery />` inside your client gallery route:

```tsx
import { ProofingGallery } from './components/ProofingGallery';

export function ClientProofingRoute({ sessionId }: { sessionId: string }) {
  return (
    <ProofingGallery
      sessionId={sessionId}
      // Optional: pass driveFolderId={folderId} directly
    />
  );
}
```

---

## 3. Connecting Real Google Drive Folders
1. In **Google Cloud Console**, enable **Google Drive API** and **Google Sheets API**.
2. Create a **Service Account**, generate a JSON key, and set:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
3. Share your private client Google Drive folder(s) with the Service Account email (**Viewer** access for read-only proofing, or **Editor** access if uploading images directly from the **Studio Admin** dashboard `?admin=1`).
4. Map session slugs to folder IDs in `GOOGLE_DRIVE_SESSION_FOLDERS` (JSON), set `GOOGLE_DRIVE_DEFAULT_FOLDER_ID`, or create/link a folder directly inside **Studio Admin -> Design & Details** (or click **Create Drive Folder** / **Sync from Drive**).
5. Set `VITE_USE_MOCK_DATA=false` (or link a Drive folder in Studio Admin). The backend (`GET /api/gallery`) lists images and proxies private Drive bytes via `/api/gallery?fileId=...` so your client folders never need to be made public.

---

## 4. Connecting Google Sheets Logging
1. Create a Google Sheet with a tab named `Selections` and column headers:
   `Timestamp | Submission ID | Session ID | Session Name | Client Name | Client Email | Count | Filenames | Photo Notes | Session Notes`
2. Share the Sheet with your Service Account email (**Editor** access).
3. Set `GOOGLE_SHEETS_SPREADSHEET_ID` in your environment.

---

## 5. Connecting Photographer Email Alerts
Notification emails default to `paulphotography256@gmail.com` (configurable via `PHOTOGRAPHER_EMAIL`) and `EMAIL_FROM`. Configure **one** of:
- **Resend (Recommended):** Set `RESEND_API_KEY`.
- **Nodemailer SMTP:** Leave `RESEND_API_KEY` empty and set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS`.
- **Google Apps Script (Zero-Server Alternative):** Deploy `apps-script/Code.gs` as a Web App and set `APPS_SCRIPT_WEBHOOK_URL` (or `VITE_API_BASE_URL`).
