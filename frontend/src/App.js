import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { SidebarProvider } from "@/context/SidebarContext";
import { TimerProvider } from "@/context/TimerContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import FloatingTimer from "@/components/FloatingTimer";
import ChatPage from "@/pages/ChatPage";
import ChatStarterPage from "@/pages/ChatStarterPage";
import SubjectsPage from "@/pages/SubjectsPage";
import WorksheetGeneratorPage from "@/pages/WorksheetGeneratorPage";
import WorksheetViewerPage from "@/pages/WorksheetViewerPage";
import MarkschemeViewerPage from "@/pages/MarkschemeViewerPage";
import CheatSheetPage from "@/pages/CheatSheetPage";
import NotesGeneratorPage from "@/pages/NotesGeneratorPage";
import NoteViewerPage from "@/pages/NoteViewerPage";
import HomePage from "@/pages/HomePage";
import ExamsPage from "@/pages/ExamsPage";
import RevisionPlanPage from "@/pages/RevisionPlanPage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user.is_admin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={user?.is_admin ? <Navigate to="/admin" replace /> : <HomePage />} />
          <Route path="/chat/new" element={<ChatStarterPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/worksheets/new" element={<WorksheetGeneratorPage />} />
          <Route path="/worksheets/:id/markscheme" element={<MarkschemeViewerPage />} />
          <Route path="/worksheets/:id/cheat-sheet" element={<CheatSheetPage />} />
          <Route path="/worksheets/:id" element={<WorksheetViewerPage />} />
          <Route path="/notes/new" element={<NotesGeneratorPage />} />
          <Route path="/notes/:id" element={<NoteViewerPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/exams/:examId/plan" element={<RevisionPlanPage />} />
          <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SidebarProvider>
          <TimerProvider>
            <AppRoutes />
            <FloatingTimer />
          </TimerProvider>
        </SidebarProvider>
      </AuthProvider>
      <Toaster position="top-right" theme="light" toastOptions={{ style: { fontFamily: "Nunito, sans-serif" } }} />
    </div>
  );
}

export default App;
