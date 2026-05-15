import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import ChatPage from "@/pages/ChatPage";
import SubjectsPage from "@/pages/SubjectsPage";
import WorksheetsPage from "@/pages/WorksheetsPage";

function App() {
  return (
    <div className="App font-serif">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:sessionId" element={<ChatPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/worksheets" element={<WorksheetsPage />} />
            <Route path="/worksheets/:id" element={<WorksheetsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" theme="light" />
    </div>
  );
}

export default App;
