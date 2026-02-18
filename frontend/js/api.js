/* ================================================
   SHOBDO THEATRE — API Client
   Communicates with FastAPI backend
   ================================================ */

const API_BASE = 'http://localhost:8000';

const api = {

  /* ---- Auth State ---- */
  get token()     { return localStorage.getItem('st_token'); },
  get role()      { return localStorage.getItem('st_role'); },
  get userEmail() { return localStorage.getItem('st_email'); },

  setAuth(token, role, email) {
    localStorage.setItem('st_token', token);
    localStorage.setItem('st_role',  role);
    localStorage.setItem('st_email', email || '');
  },

  clearAuth() {
    localStorage.removeItem('st_token');
    localStorage.removeItem('st_role');
    localStorage.removeItem('st_email');
  },

  isLoggedIn() { return !!this.token; },
  isAdmin()    { return this.role === 'admin'; },

  /* ---- HTTP Core ---- */
  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  },

  async request(method, endpoint, body = null) {
    const opts = { method, headers: this._headers() };
    if (body !== null) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, opts);
    } catch {
      throw new Error('Network error — check your connection or API server.');
    }

    if (res.status === 401) {
      this.clearAuth();
      window.location.href = 'index.html';
      return;
    }

    // Try to parse JSON response
    let data = {};
    try { data = await res.json(); } catch { /* empty response */ }

    if (!res.ok) {
      throw new Error(data.detail || `Request failed (${res.status})`);
    }

    return data;
  },

  /* ---- Auth ---- */
  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setAuth(data.access_token, data.role, email);
    return data;
  },

  logout() {
    this.clearAuth();
    window.location.href = 'index.html';
  },

  createSubAdmin(payload) {
    return this.request('POST', '/auth/sub-admin', payload);
  },

  /* ---- Dramas ---- */
  getDramas()         { return this.request('GET',    '/dramas/'); },
  createDrama(d)      { return this.request('POST',   '/dramas/', d); },
  updateDrama(id, d)  { return this.request('PUT',    `/dramas/${id}`, d); },
  deleteDrama(id)     { return this.request('DELETE', `/dramas/${id}`); },

  /* ---- SMS ---- */
  sendSMS(dramaId) { return this.request('POST', `/sms/send/${dramaId}`); },

  /* ---- Contacts ---- */
  getContacts()         { return this.request('GET',    '/contacts/'); },
  createContact(d)      { return this.request('POST',   '/contacts/', d); },
  updateContact(id, d)  { return this.request('PUT',    `/contacts/${id}`, d); },
  deleteContact(id)     { return this.request('DELETE', `/contacts/${id}`); },
};
