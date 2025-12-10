# Patient Portal – Full Stack Assessment

A simple healthcare patient portal where a user can upload, view, download, and delete their medical PDF documents.[file:10]

## Features

- Upload PDF files (prescriptions, test results, etc.).[file:10]
- List all uploaded documents with filename, size, and upload time.[file:10]
- Download any document.[file:10]
- Delete a document when no longer needed.[file:10]

## Tech Stack

- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js, Express
- Database: SQLite (file-based)
- File storage: Local `uploads/` folder in the backend

## Project Structure

patient-portal/
├── design.md # Design document (stack, architecture, APIs, assumptions)
├── README.md # This file
├── frontend/
│ ├── index.html # UI for upload/list/download/delete
│ ├── style.css # Styling
│ └── app.js # Frontend logic (fetch calls to backend)
└── backend/
├── server.js # Express server with all required endpoints
├── package.json # Node.js dependencies and start script
└── database.db # SQLite database (created automatically at runtime)

## How to Run Locally

1. **Start backend API**

cd backend
npm install # first time only
npm start


The backend will run at:
http://localhost:5000/


2. **Open frontend**

- Go to the `frontend` folder in File Explorer.
- Double‑click `index.html` and open it in your browser (Chrome/Edge).

## How to Use

1. Click **Choose file** and select a PDF.
2. Click **Upload**.
3. The document appears in the table below.
4. Use **Download** to download a file.
5. Use **Delete** to remove a file from the list and storage.[file:10]

## API Endpoints

- `POST /documents/upload` – Upload a PDF (multipart/form-data, field name: `file`).[file:10]
- `GET /documents` – List all documents (JSON array).[file:10]
- `GET /documents/:id` – Download a specific document by id.[file:10]
- `DELETE /documents/:id` – Delete a specific document by id.[file:10]

## Notes

- Files are stored locally under `backend/uploads/`.[file:10]
- Metadata is stored in SQLite table `documents (id, filename, filepath, filesize, created_at)`.[file:10]
- The app assumes a single user and runs on localhost as per assessment instructions.[file:10]

