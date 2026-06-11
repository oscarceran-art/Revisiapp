import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("revisiapp_auth");
  if (raw) {
    try {
      const { token } = JSON.parse(raw);
      if (token) config.headers["Authorization"] = `Bearer ${token}`;
    } catch {}
  }
  return config;
});

// Handle 401 responses — clear auth and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("revisiapp_auth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

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

// Personas
export const listPersonas = () => api.get("/personas").then(r => r.data.items);
export const createCustomPersona = (data) => api.post("/personas/custom", data).then(r => r.data);
export const deleteCustomPersona = (id) => api.delete(`/personas/custom/${id}`).then(r => r.data);

// Chat
export const listSessions = () => api.get("/chat/sessions").then(r => r.data);
export const createSession = (data) => api.post("/chat/sessions", data).then(r => r.data);
export const deleteSession = (id) => api.delete(`/chat/sessions/${id}`).then(r => r.data);
export const updateSessionSettings = (id, data) =>
  api.patch(`/chat/sessions/${id}/settings`, data).then(r => r.data);
export const getMessages = (id) => api.get(`/chat/sessions/${id}/messages`).then(r => r.data);
export const sendUserMessage = (session_id, message) =>
  api.post("/chat/send-user-message", { session_id, message }).then(r => r.data);
export const generateMorningQuiz = (session_id) =>
  api.post(`/chat/sessions/${session_id}/morning-quiz`).then(r => r.data);
export const summariseChat = (session_id) =>
  api.post(`/chat/sessions/${session_id}/summary`).then(r => r.data);

// Streamed reply
export async function* streamReply(session_id, persona_id) {
  const raw = localStorage.getItem("revisiapp_auth");
  let token = "";
  try { token = JSON.parse(raw || "{}").token || ""; } catch {}

  const res = await fetch(`${API}/chat/stream-reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ session_id, persona_id }),
  });
  if (!res.ok || !res.body) throw new Error("stream failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = JSON.parse(line.slice(5).trim());
      yield data;
    }
  }
  if (buffer.startsWith("data:")) {
    try { yield JSON.parse(buffer.slice(5).trim()); } catch {}
  }
}

// Worksheets
export const generateWorksheet = (data) => api.post("/worksheets/generate", data).then(r => r.data);
export const worksheetFromPastPaper = (file, subject_id, difficulty, num_questions) => {
  const fd = new FormData();
  fd.append("file", file);
  if (subject_id) fd.append("subject_id", subject_id);
  fd.append("difficulty", difficulty);
  if (num_questions) fd.append("num_questions", String(num_questions));
  return api.post("/worksheets/from-past-paper", fd, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then(r => r.data);
};
export const listWorksheets = () => api.get("/worksheets").then(r => r.data);
export const getWorksheet = (id) => api.get(`/worksheets/${id}`).then(r => r.data);
export const deleteWorksheet = (id) => api.delete(`/worksheets/${id}`).then(r => r.data);
export const markWorksheet = (id, answers) => api.post(`/worksheets/${id}/mark`, { answers }).then(r => r.data);
export const generateCheatSheet = (id) => api.post(`/worksheets/${id}/cheat-sheet`).then(r => r.data);
export const getCheatSheet = (id) => api.get(`/worksheets/${id}/cheat-sheet`).then(r => r.data);

// Notes
export const listNotes = () => api.get("/notes").then(r => r.data);
export const generateNotes = (data) => api.post("/notes/generate", data).then(r => r.data);
export const getNote = (id) => api.get(`/notes/${id}`).then(r => r.data);
export const deleteNote = (id) => api.delete(`/notes/${id}`).then(r => r.data);
export const worksheetFromNotes = (id, data) => api.post(`/notes/${id}/worksheet`, data).then(r => r.data);

export const avatarUrl = (seed) =>
  `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "anon")}&backgroundType=solid&backgroundColor=f3e8d8,e8d8c4,d9e6f2,e6dff5,ffe0d6`;

export const customAvatarUrl = (seed) =>
  `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "anon")}&backgroundType=solid&backgroundColor=1a1a1a,2d2d2d,3a3a3a&hair=bald,buzzcut,bobBangs,longCurls,pixie,short,shortCombover&hairColor=ac6651,d2eff3,e2ba87,f2a07b,fc909f`;

// Exams
export const listExams = () => api.get("/exams").then(r => r.data);
export const createExam = (data) => api.post("/exams", data).then(r => r.data);
export const updateExam = (id, data) => api.patch(`/exams/${id}`, data).then(r => r.data);
export const deleteExam = (id) => api.delete(`/exams/${id}`).then(r => r.data);
export const startExamDebrief = (id) => api.post(`/exams/${id}/debrief`).then(r => r.data);

export const getRevisionPlan = (examId) => api.get(`/exams/${examId}/plan`).then(r => r.data);
export const generateRevisionPlan = (examId) => api.post(`/exams/${examId}/plan`).then(r => r.data);
export const togglePlanTask = (examId, day_index, task_index, done) =>
  api.patch(`/exams/${examId}/plan/task`, { day_index, task_index, done }).then(r => r.data);
export const generateTaskContent = (examId, day_index, task_index, kind) =>
  api.post(`/exams/${examId}/plan/task/generate`, { day_index, task_index, kind }).then(r => r.data);
export const getMorningBrief = (examId) => api.get(`/exams/${examId}/morning-brief`).then(r => r.data);

export const setWorksheetConfidence = (id, rating, notes = "") =>
  api.post(`/worksheets/${id}/confidence`, { rating, notes }).then(r => r.data);

export const search = (q) => api.get(`/search`, { params: { q } }).then(r => r.data);

// Admin
export const adminListUsers = () => api.get("/admin/users").then(r => r.data);
export const adminUpdateUser = (id, data) => api.patch(`/admin/users/${id}`, data).then(r => r.data);
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`).then(r => r.data);
export const adminCreateUser = (data) => api.post("/admin/users", data).then(r => r.data);
export const adminResetTokens = (id) => api.post(`/admin/users/${id}/reset-tokens`).then(r => r.data);

// Flashcards
export const listDecks = () => api.get("/flashcards/decks").then(r => r.data);
export const createDeck = (data) => api.post("/flashcards/decks", data).then(r => r.data);
export const deleteDeck = (id) => api.delete(`/flashcards/decks/${id}`).then(r => r.data);
export const listCards = (deckId, dueOnly = false) =>
  api.get(`/flashcards/decks/${deckId}/cards`, { params: { due_only: dueOnly } }).then(r => r.data);
export const createCard = (deckId, data) =>
  api.post(`/flashcards/decks/${deckId}/cards`, data).then(r => r.data);
export const reviewCard = (cardId, quality) =>
  api.post(`/flashcards/cards/${cardId}/review`, { quality }).then(r => r.data);
export const deleteCard = (cardId) => api.delete(`/flashcards/cards/${cardId}`).then(r => r.data);
export const generateCards = (deckId, topic, count = 10, model = null) => {
  const fd = new FormData();
  fd.append("topic", topic);
  fd.append("count", count);
  if (model) fd.append("model", model);
  return api.post(`/flashcards/decks/${deckId}/generate`, fd).then(r => r.data);
};
export const generateCardsFromNotes = (deckId, noteId, model = null) => {
  const fd = new FormData();
  if (model) fd.append("model", model);
  return api.post(`/flashcards/decks/${deckId}/generate-from-notes/${noteId}`, fd).then(r => r.data);
};
export const generateCardsFromWorksheet = (deckId, worksheetId, model = null) => {
  const fd = new FormData();
  if (model) fd.append("model", model);
  return api.post(`/flashcards/decks/${deckId}/generate-from-worksheet/${worksheetId}`, fd).then(r => r.data);
};
export const getDueCount = () => api.get("/flashcards/due-count").then(r => r.data);

// Workspace (Revision Workspace)
export const workspaceGenerateText = (data) => api.post("/workspace/generate-text", data).then(r => r.data);
export const workspaceGenerateDiagram = (data) => api.post("/workspace/generate-diagram", data).then(r => r.data);
export const workspaceCheckRecall = (data) => api.post("/workspace/check-recall", data).then(r => r.data);
export const workspaceCheckDiagram = (data) => api.post("/workspace/check-diagram", data).then(r => r.data);
export const listBlurtingExercises = () => api.get("/workspace/blurting").then(r => r.data);
export const listDiagramExercises = () => api.get("/workspace/diagrams").then(r => r.data);
export const deleteBlurtingExercise = (id) => api.delete(`/workspace/blurting/${id}`).then(r => r.data);
export const deleteDiagramExercise = (id) => api.delete(`/workspace/diagrams/${id}`).then(r => r.data);
