import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Subjects
export const listSubjects = () => api.get("/subjects").then(r => r.data);
export const createSubject = (data) => api.post("/subjects", data).then(r => r.data);
export const updateSubject = (id, data) => api.patch(`/subjects/${id}`, data).then(r => r.data);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`).then(r => r.data);
export const uploadSubjectNotes = (id, file, append = true) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("append", append);
  return api.post(`/subjects/${id}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
};

// Chat
export const listSessions = () => api.get("/chat/sessions").then(r => r.data);
export const createSession = (data) => api.post("/chat/sessions", data).then(r => r.data);
export const deleteSession = (id) => api.delete(`/chat/sessions/${id}`).then(r => r.data);
export const getMessages = (id) => api.get(`/chat/sessions/${id}/messages`).then(r => r.data);
export const sendMessage = (session_id, message) => api.post("/chat/send", { session_id, message }).then(r => r.data);

// Worksheets
export const generateWorksheet = (data) => api.post("/worksheets/generate", data).then(r => r.data);
export const listWorksheets = () => api.get("/worksheets").then(r => r.data);
export const getWorksheet = (id) => api.get(`/worksheets/${id}`).then(r => r.data);
export const deleteWorksheet = (id) => api.delete(`/worksheets/${id}`).then(r => r.data);
export const markWorksheet = (id, answers) => api.post(`/worksheets/${id}/mark`, { answers }).then(r => r.data);
