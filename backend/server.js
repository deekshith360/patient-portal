const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// Multer storage + validation (PDF, max 10MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const base = file.originalname.replace(/\.[^/.]+$/, '');
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}.pdf`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// SQLite setup
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        filesize INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// POST /documents/upload – upload a PDF
app.post('/documents/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const originalName = req.file.originalname;
  const savedName = req.file.filename;
  const fileSize = req.file.size;

  db.run(
    `INSERT INTO documents (filename, filepath, filesize) VALUES (?, ?, ?)`,
    [originalName, savedName, fileSize],
    function (err) {
      if (err) {
        fs.unlink(path.join(uploadFolder, savedName), () => {});
        return res.status(500).json({ success: false, message: 'Error saving document metadata' });
      }
      res.json({
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: this.lastID,
          filename: originalName,
          filesize: fileSize,
          created_at: new Date().toISOString()
        }
      });
    }
  );
});

// GET /documents – list all documents
app.get('/documents', (req, res) => {
  db.all(
    `SELECT id, filename, filesize, created_at FROM documents ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      res.json({ success: true, documents: rows || [] });
    }
  );
});

// GET /documents/:id – download a file
app.get('/documents/:id', (req, res) => {
  const id = req.params.id;
  db.get(
    `SELECT filename, filepath FROM documents WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      const filePath = path.join(uploadFolder, row.filepath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found on disk' });
      }
      res.download(filePath, row.filename);
    }
  );
});

// DELETE /documents/:id – delete file + metadata
app.delete('/documents/:id', (req, res) => {
  const id = req.params.id;
  db.get(
    `SELECT filepath FROM documents WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      const filePath = path.join(uploadFolder, row.filepath);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }

      db.run(`DELETE FROM documents WHERE id = ?`, [id], deleteErr => {
        if (deleteErr) {
          return res.status(500).json({ success: false, message: 'Error deleting document' });
        }
        res.json({ success: true, message: 'Document deleted successfully' });
      });
    }
  );
});

// Error handler (multer + generic)
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File size exceeds 10MB limit' });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
