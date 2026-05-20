import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { SidebarProvider } from "@/context/SidebarContext";
import { TimerProvider } from "@/context/TimerContext";
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

function App() {
  return (
    <div className="App">
      <SidebarProvider>
        <TimerProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
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
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <FloatingTimer />
        </TimerProvider>
      </SidebarProvider>
      <Toaster position="top-right" theme="light" toastOptions={{ style: { fontFamily: "Nunito, sans-serif" } }} />
    </div>
  );
}

export default App;
