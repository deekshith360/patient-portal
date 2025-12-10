# Healthcare Patient Portal - Design Document

## 1. Tech Stack Choices

### Q1. What frontend framework did you use and why?

**Answer: HTML5, CSS3, and Vanilla JavaScript (no framework)**

- Simple to set up and runs directly in the browser without any build tools.
- Enough for a small single-page app with a form, table, and basic interactions.
- Keeps the focus on core web fundamentals, which matches the assessment goal.
- Easy for reviewers to read and understand without needing React/Vue knowledge.
- Reduces complexity and avoids extra configuration (bundlers, transpilers, etc.).

### Q2. What backend framework did you choose and why?

**Answer: Node.js with Express.js**

- Uses JavaScript on both frontend and backend, which simplifies development.
- Express makes it easy to define REST endpoints for upload, list, download, and delete.
- Has mature middleware like `multer` for handling file uploads cleanly.
- Lightweight and fast, well-suited for a small local API service.
- Very common in industry, especially for entry-level full stack roles.

### Q3. What database did you choose and why?

**Answer: SQLite**

- Simple file-based database, no separate DB server needed.
- Perfect for a local, single-user application as described in the assignment.
- Easy to set up and bundle with the project (just one `.db` file).
- Supports SQL and structured schema (id, filename, filepath, filesize, created_at).
- Can be migrated to PostgreSQL later if multi-user or cloud deployment is needed.

### Q4. If you were to support 1,000 users, what changes would you consider?

- **Database:**
  - Migrate from SQLite to PostgreSQL for better concurrency and reliability.
  - Add a `users` table and link documents to users with `user_id`.
  - Add indexes on frequently queried columns (user_id, created_at).
- **File storage:**
  - Move from local `uploads/` folder to cloud storage (e.g., AWS S3).
  - Serve files through a CDN for faster downloads.
- **Backend & API:**
  - Add authentication and authorization (JWT-based login).
  - Add rate limiting and input validation to protect the API.
  - Introduce a caching layer (e.g., Redis) for frequently accessed data.
  - Use multiple backend instances behind a load balancer.
- **Frontend:**
  - Add pagination or infinite scroll for large document lists.
  - Add search/filter by filename or upload date.
- **Infrastructure:**
  - Containerize the app using Docker.
  - Set up CI/CD pipelines and monitoring (logs, metrics, alerts).

---

## 2. Architecture Overview

### High-level flow

1. The **frontend** (HTML/CSS/JS) runs in the browser and provides:
   - A form to upload a PDF file.
   - A table showing all uploaded documents.
   - Buttons to download or delete each document.
2. The **backend** is an Express server that exposes REST APIs:
   - `POST /documents/upload` to upload a PDF.
   - `GET /documents` to list all documents.
   - `GET /documents/:id` to download a document.
   - `DELETE /documents/:id` to delete a document.
3. The **file storage** is a local `uploads/` folder where the PDF files are stored.
4. The **database** is SQLite, with a `documents` table storing metadata:
   - `id`, `filename`, `filepath`, `filesize`, `created_at`.

### Simple architecture diagram (text)

- Browser (frontend)
  - Renders UI and sends HTTP requests using `fetch`.
  - Talks to the backend via `http://localhost:5000`.

- Express backend (Node.js)
  - Receives HTTP requests.
  - Uses `multer` to handle file uploads.
  - Uses `sqlite3` to read/write document metadata.
  - Uses the filesystem to read/write PDF files in `uploads/`.

- SQLite database
  - Table: `documents (id, filename, filepath, filesize, created_at)`.

- File system
  - Folder: `backend/uploads/` containing actual PDF files.

---

## 3. API Specification

### 1) Upload a PDF

- **Endpoint:** `/documents/upload`
- **Method:** `POST`
- **Description:** Upload a single PDF file and store its metadata.

**Request:**

- Content-Type: `multipart/form-data`
- Body:
  - `file`: the PDF file selected by the user.

**Sample response (success):**
{
"success": true,
"message": "Document uploaded successfully",
"document": {
"id": 1,
"filename": "prescription.pdf",
"filesize": 2048576,
"created_at": "2025-12-10T10:30:00.000Z"
}
}

**Sample response (error - not PDF):**


---

### 2) List all documents

- **Endpoint:** `/documents`
- **Method:** `GET`
- **Description:** Returns a list of all uploaded documents with basic metadata.

**Request:**

- No body or parameters.

**Sample response (success):**

{
"success": true,
"documents": [
{
"id": 1,
"filename": "prescription.pdf",
"filesize": 2048576,
"created_at": "2025-12-10T10:30:00.000Z"
},
{
"id": 2,
"filename": "test_results.pdf",
"filesize": 1024000,
"created_at": "2025-12-10T11:00:00.000Z"
}
]
}

**Sample response (error):**


---

### 3) Download a file

- **Endpoint:** `/documents/:id`
- **Method:** `GET`
- **Description:** Downloads the PDF file with the given ID.

**Request:**

- URL path parameter: `id` (document id, e.g. `/documents/1`)

**Response (success):**

- Returns the PDF as a file download.
- Headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="original_filename.pdf"`

**Response (error - not found):**

{
"success": false,
"message": "Document not found"
}

---

### 4) Delete a file

- **Endpoint:** `/documents/:id`
- **Method:** `DELETE`
- **Description:** Deletes the file and its metadata entry.

**Request:**

- URL path parameter: `id` (document id, e.g. `/documents/1`)

**Sample response (success):**
{
"success": true,
"message": "Document deleted successfully"
}

**Sample response (error - not found):**
{
"success": false,
"message": "Document not found"
}

---

## 4. Data Flow Description

### Q5. What happens when a file is uploaded?

1. The user opens the patient portal in the browser and selects a PDF file using the upload form.
2. The frontend JavaScript validates the file type (must be PDF) and size (within allowed limit).
3. The frontend creates a `FormData` object and appends the file under the key `file`.
4. The frontend sends a `POST /documents/upload` request to the backend with the `FormData`.
5. Express receives the request and `multer` processes the file:
   - Stores the file in the `uploads/` folder with a unique name.
   - Exposes file details like `originalname`, `filename`, `size`, and `path`.
6. The backend inserts a new row into the `documents` SQLite table:
   - `filename` = original file name (e.g. `prescription.pdf`)
   - `filepath` = stored file name (e.g. `prescription-123456789.pdf`)
   - `filesize` = file size in bytes
   - `created_at` = current timestamp (handled by DB default).
7. The backend sends a JSON response with `success: true` and the new document metadata.
8. The frontend receives the response, shows a success message, clears the form, and refreshes the document list by calling `GET /documents`.

### What happens when a file is downloaded?

1. The user clicks the **Download** button for a specific document in the list.
2. The frontend knows the `id` of that document and sends a `GET /documents/:id` request.
3. The backend looks up that `id` in the `documents` table to find the corresponding `filepath` and `filename`.
4. If the record exists and the file still exists in the `uploads/` folder, the backend streams the file back to the browser with:
   - `Content-Type: application/pdf`
   - `Content-Disposition: attachment; filename="original_filename.pdf"`.
5. The browser receives the response and opens the download dialog or saves the file to the Downloads folder.
6. If the record or file is missing, the backend returns an error JSON (e.g., `Document not found`).

---

## 5. Assumptions

### Q6. Assumptions made while building this

- **Users & authentication:**
  - Only one logical user; no login or registration is implemented.
  - All requests are treated as coming from the same trusted user.
- **File types:**
  - Only PDF files are allowed.
  - File type is validated by MIME type and extension on both frontend and backend.
- **File size:**
  - There is a maximum file size limit (for example, 10 MB per file).
  - Larger files are rejected with a clear error message.
- **Storage:**
  - Files are stored locally in a folder named `uploads/` inside the backend project.
  - No cloud storage or backup is implemented.
- **Database:**
  - SQLite is sufficient for local development and one user.
  - All operations are simple inserts, selects, and deletes on a single table.
- **Concurrency:**
  - The app is expected to handle low traffic (single user), so no special concurrency control is implemented.
- **Security:**
  - The app is intended to run on `localhost` only, not exposed to the internet.
  - HTTPS, authentication, and advanced security measures are out of scope for this assignment.
- **Error handling:**
  - Errors are returned as simple JSON messages.
  - No complex logging or monitoring system is implemented.

---

This design document matches the assignment requirements:
- Tech stack choices with reasons.
- Architecture overview.
- API specification for all required endpoints.
- Data flow for upload and download.
- Clear list of assumptions.

