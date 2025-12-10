const API_BASE = 'http://localhost:5000';

const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');
const emptyDiv = document.getElementById('empty');
const docsTable = document.getElementById('docsTable');
const docsBody = document.getElementById('docsBody');

function showMessage(text, type = 'success') {
  messageDiv.textContent = text;
  messageDiv.className = '';
  messageDiv.classList.add(type);
}

async function loadDocuments() {
  loadingDiv.classList.remove('hidden');
  emptyDiv.classList.add('hidden');
  docsTable.classList.add('hidden');
  docsBody.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/documents`);
    const data = await res.json();

    loadingDiv.classList.add('hidden');

    if (!data.success || !data.documents || data.documents.length === 0) {
      emptyDiv.classList.remove('hidden');
      return;
    }

    docsTable.classList.remove('hidden');

    data.documents.forEach(doc => {
      const tr = document.createElement('tr');

      const sizeMb = (doc.filesize / (1024 * 1024)).toFixed(2);
      const created = new Date(doc.created_at).toLocaleString();

      tr.innerHTML = `
        <td>${doc.filename}</td>
        <td>${sizeMb}</td>
        <td>${created}</td>
        <td class="actions">
          <button onclick="downloadDoc(${doc.id}, '${doc.filename}')">Download</button>
          <button onclick="deleteDoc(${doc.id})">Delete</button>
        </td>
      `;
      docsBody.appendChild(tr);
    });
  } catch (err) {
    loadingDiv.classList.add('hidden');
    showMessage('Failed to load documents', 'error');
  }
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    showMessage('Please choose a PDF file', 'error');
    return;
  }
  if (file.type !== 'application/pdf') {
    showMessage('Only PDF files are allowed', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showMessage(data.message || 'Upload failed', 'error');
      return;
    }
    showMessage('Upload successful', 'success');
    fileInput.value = '';
    await loadDocuments();
  } catch (err) {
    showMessage('Upload failed', 'error');
  }
});

window.downloadDoc = async (id, filename) => {
  try {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) {
      showMessage('Download failed', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    showMessage('Download failed', 'error');
  }
};

window.deleteDoc = async (id) => {
  if (!confirm('Are you sure you want to delete this document?')) return;
  try {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showMessage(data.message || 'Delete failed', 'error');
      return;
    }
    showMessage('Document deleted', 'success');
    await loadDocuments();
  } catch (err) {
    showMessage('Delete failed', 'error');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  loadDocuments();
});
