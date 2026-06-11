import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Trash, UploadSimple, FloppyDisk } from "@phosphor-icons/react";
import { listSubjects, createSubject, updateSubject, deleteSubject, uploadSubjectNotes } from "@/lib/api";
import { useSidebarData } from "@/context/SidebarContext";

export default function SubjectsPage() {
  const { refresh: refreshSidebar } = useSidebarData();
  const [subjects, setSubjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState({ name: "", description: "", notes: "" });
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const selected = subjects.find(s => s.id === selectedId);

  const refresh = async (preserveId = null) => {
    const s = await listSubjects();
    setSubjects(s);
    refreshSidebar();
    if (preserveId) setSelectedId(preserveId);
    else if (!selectedId && s.length) setSelectedId(s[0].id);
    return s;
  };

  useEffect(() => { refresh().catch(() => {}); }, []);

  useEffect(() => {
    if (selected) setEditing({
      name: selected.name || "",
      description: selected.description || "",
      notes: selected.notes || "",
    });
  }, [selectedId]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const s = await createSubject({ name: newName.trim() });
      setNewName("");
      setShowNew(false);
      await refresh(s.id);
      toast.success("Subject added");
    } catch {
      toast.error("Could not create subject");
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateSubject(selected.id, editing);
      await refresh(selected.id);
      toast.success("Saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}"?`)) return;
    await deleteSubject(selected.id);
    const remaining = subjects.filter(s => s.id !== selected.id);
    setSubjects(remaining);
    setSelectedId(remaining[0]?.id || null);
    toast.success("Deleted");
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    try {
      const res = await uploadSubjectNotes(selected.id, file, true);
      await refresh(selected.id);
      toast.success(`Loaded ${res.characters} chars from ${res.filename}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen pt-14 md:pt-14 px-4 sm:px-6 md:px-14 pb-16" data-testid="subjects-page">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/45">Library</div>
            <h1 className="display text-4xl md:text-5xl mt-2">Subjects</h1>
            <p className="text-black/55 mt-3 max-w-xl">Add subjects with notes — Revisia uses them as context for chats and worksheets.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          {/* List */}
          <div>
            <button
              onClick={() => setShowNew(true)}
              className="w-full bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl py-2.5 px-4 flex items-center justify-center gap-2 active:scale-[0.98] mb-3 hover:opacity-90 transition-opacity"
              data-testid="add-subject-btn"
            >
              <Plus size={16} weight="bold" /> New subject
            </button>

            {showNew && (
              <div className="border border-black/15 rounded-2xl p-3 mb-3 bg-white">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNew(false); }}
                  placeholder="e.g. A-Level Biology"
                  className="w-full border border-black/15 rounded-xl px-3 py-2 focus:outline-none focus:border-black text-sm"
                  data-testid="new-subject-name"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleCreate} className="text-sm bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-xl px-3 py-1.5 active:scale-[0.98] hover:opacity-90 transition-opacity" data-testid="confirm-subject-btn">Add</button>
                  <button onClick={() => { setShowNew(false); setNewName(""); }} className="text-sm text-black/60 px-3 py-1.5">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {subjects.length === 0 && !showNew && (
                <div className="text-center py-12 px-4 border border-dashed border-black/15 rounded-2xl">
                  <BookOpen size={36} weight="duotone" className="mx-auto text-black/30" />
                  <div className="text-sm text-black/50 mt-3">No subjects yet</div>
                </div>
              )}
              {subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left rounded-2xl px-3 py-2.5 transition-colors ${selectedId === s.id ? "bg-black text-white" : "hover:bg-black/[0.04] text-black"}`}
                  data-testid={`subject-item-${s.id}`}
                >
                  <div className="text-sm truncate">{s.name}</div>
                  <div className={`text-xs mt-0.5 truncate ${selectedId === s.id ? "text-white/60" : "text-black/40"}`}>
                    {(s.notes || "").length > 0 ? `${(s.notes || "").length} chars of notes` : "No notes"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div>
            {selected ? (
              <div className="bg-white border border-black/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8" data-testid="subject-editor">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                  <input
                    value={editing.name}
                    onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
                    className="display text-xl sm:text-2xl md:text-3xl bg-transparent border-b border-transparent focus:border-black/30 focus:outline-none w-full sm:w-auto"
                    data-testid="subject-name-input"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.docx" onChange={handleUpload} className="hidden" data-testid="upload-file-input" />
                    <button onClick={() => fileRef.current?.click()} className="border border-black/15 rounded-2xl px-3 py-2 text-sm flex items-center gap-2 hover:bg-black/[0.04]" data-testid="upload-notes-btn">
                      <UploadSimple size={16} weight="regular" /> Upload notes
                    </button>
                    <button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-pink-400 to-blue-500 text-white rounded-2xl px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 active:scale-[0.98] hover:opacity-90 transition-opacity" data-testid="save-subject-btn">
                      <FloppyDisk size={16} weight="regular" /> {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={handleDelete} className="text-black/40 hover:text-red-600 p-2" data-testid="delete-subject-btn" aria-label="Delete subject">
                      <Trash size={18} weight="regular" />
                    </button>
                  </div>
                </div>

                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-2 block">Description</label>
                <input
                  value={editing.description}
                  onChange={e => setEditing(v => ({ ...v, description: e.target.value }))}
                  placeholder="A short description of this subject"
                  className="w-full border border-black/15 rounded-2xl px-4 py-2.5 mb-6 focus:outline-none focus:border-black"
                  data-testid="subject-description-input"
                />

                <label className="text-[11px] uppercase tracking-[0.22em] text-black/50 mb-2 block">Notes / Context</label>
                <textarea
                  value={editing.notes}
                  onChange={e => setEditing(v => ({ ...v, notes: e.target.value }))}
                  placeholder="Paste your revision notes here, or upload a .txt / .pdf / .docx file."
                  rows={18}
                  className="w-full border border-black/15 rounded-2xl px-4 py-3 focus:outline-none focus:border-black text-sm leading-relaxed"
                  data-testid="subject-notes-input"
                />
                <div className="text-xs text-black/40 mt-2">{(editing.notes || "").length.toLocaleString()} characters</div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-black/15 rounded-3xl p-16 text-center">
                <BookOpen size={48} weight="duotone" className="mx-auto text-black/30" />
                <h3 className="display text-2xl mt-4">No subject selected</h3>
                <p className="text-black/50 mt-2">Create one to start adding context.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
