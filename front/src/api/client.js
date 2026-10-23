import { apiBaseUrl } from "../lib/backend";

const API_BASE = apiBaseUrl();

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || null;
  }
}

function getToken() {
  return localStorage.getItem("citofonia.token");
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || `Error ${res.status}`;
    throw new ApiError(message, res.status, data?.fieldErrors);
  }
  return data;
}

export const authApi = {
  login: (email, password) =>
    api("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  register: (payload) =>
    api("/api/auth/register", { method: "POST", body: payload, auth: false }),
  me: () => api("/api/auth/me"),
};

export const usersApi = {
  list: (page = 0, size = 20) => api(`/api/users?page=${page}&size=${size}`),
  pending: (page = 0, size = 20) =>
    api(`/api/users/pending?page=${page}&size=${size}`),
  get: (id) => api(`/api/users/${id}`),
  create: (payload) => api("/api/users", { method: "POST", body: payload }),
  update: (id, payload) =>
    api(`/api/users/${id}`, { method: "PUT", body: payload }),
  remove: (id) => api(`/api/users/${id}`, { method: "DELETE" }),
  enable: (id) => api(`/api/users/${id}/enable`, { method: "PATCH" }),
  disable: (id) => api(`/api/users/${id}/disable`, { method: "PATCH" }),
  assignApartment: (id, apartmentId) =>
    api(`/api/users/${id}/apartment`, {
      method: "PATCH",
      body: { apartmentId },
    }),
  updateHousing: (id, payload) =>
    api(`/api/users/${id}`, { method: "PUT", body: payload }),
};

export const apartmentsApi = {
  options: () => api("/api/apartments/options", { auth: false }),
  list: (page = 0, size = 200) =>
    api(`/api/apartments?page=${page}&size=${size}`),
};

export const notificationsApi = {
  preferences: () => api("/api/notifications/preferences"),
};

export const mailApi = {
  messages: () => api("/api/mail/messages"),
  stats: () => api("/api/mail/stats"),
  markRead: (id) => api(`/api/mail/messages/${id}/read`, { method: "PATCH" }),
  markAllRead: () => api("/api/mail/read-all", { method: "POST" }),
  send: (payload) => api("/api/admin/mail", { method: "POST", body: payload }),
};

export const callsApi = {
  residents: () => api("/api/calls/residents"),
  staff: () => api("/api/calls/staff"),
  apartments: () => api("/api/calls/apartments"),
  apartmentResidents: (id) => api(`/api/calls/apartments/${id}/residents`),
};

export const visitsApi = {
  list: (page = 0, size = 20) => api(`/api/visits?page=${page}&size=${size}`),
  mine: (page = 0, size = 20) =>
    api(`/api/visits/mine?page=${page}&size=${size}`),
  recipients: (apartmentId) =>
    api(`/api/visits/recipients?apartmentId=${apartmentId}`),
  create: (payload) => api("/api/visits", { method: "POST", body: payload }),
  notify: (id, residentIds) =>
    api(`/api/visits/${id}/notify`, { method: "POST", body: { residentIds } }),
  updateStatus: (id, status, exitAt) =>
    api(`/api/visits/${id}/status`, {
      method: "PATCH",
      body: { status, exitAt: exitAt || null },
    }),
};

export const correspondenceApi = {
  list: (page = 0, size = 20) =>
    api(`/api/correspondences?page=${page}&size=${size}`),
  mine: (page = 0, size = 20) =>
    api(`/api/correspondences/mine?page=${page}&size=${size}`),
  recipients: (apartmentId) =>
    api(`/api/correspondences/recipients?apartmentId=${apartmentId}`),
  create: (payload) =>
    api("/api/correspondences", { method: "POST", body: payload }),
  notify: (id, residentIds) =>
    api(`/api/correspondences/${id}/notify`, {
      method: "POST",
      body: { residentIds },
    }),
  holdAtDesk: (id) =>
    api(`/api/correspondences/${id}/hold`, { method: "POST" }),
  updateStatus: (id, status, delivery) =>
    api(`/api/correspondences/${id}/status`, {
      method: "PATCH",
      body: { status, delivery: delivery || null },
    }),
};
