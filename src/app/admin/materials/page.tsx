"use client";

/**
 * CHANGE: Materials page — visual + behavior updates
 * - NEW: Context card now has an "Add" button bottom-left. After adding (first save),
 *        the context becomes read-only and the button changes to "Edit" to allow updates.
 *        (Requirement: one context per org; can only edit after creation.)
 * - CHANGE: All buttons in this page use the same blue style (`btn-primary`)
 *        to match the Metrics page and keep visual consistency.
 * - Existing: Upload PDF with title/description, list in Knowledge-base with actions.
 *
 * NOTE: This remains UI-only. Replace local state with API calls when wiring backend.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { FileText, UploadCloud, X, Archive, Trash2, Download } from "lucide-react";

type Material = {
  id: string;
  title: string;
  description?: string;
  filename: string;
  size: number;
  type: string; // MIME
  createdAt: string;
  archived?: boolean;
  url?: string; // demo object URL
};

export default function AdminMaterialsPage() {
  /* ---------------- Context (one-time add, then editable) ---------------- */
  const [context, setContext] = useState<string>("");
  // CHANGE: When `contextLocked` is true, the textarea is read-only; button is "Edit".
  // On first save, we set `contextLocked=true`.
  const [contextLocked, setContextLocked] = useState<boolean>(false);

  const onSaveContext = () => {
    if (!context.trim()) return;
    setContextLocked(true); // lock after first add
  };
  const onEditContext = () => setContextLocked(false); // allow editing again

  /* ---------------- Upload form & list (demo/local) ---------------- */
  const [items, setItems] = useState<Material[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const canSubmit = useMemo(() => !!file && title.trim().length > 0, [file, title]);

  const handlePick = () => fileInputRef.current?.click();

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, ""));
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDesc("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;

    // Demo-only persistence
    const url = URL.createObjectURL(file);
    const item: Material = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: desc.trim() || undefined,
      filename: file.name,
      size: file.size,
      type: file.type,
      createdAt: new Date().toISOString(),
      url,
    };
    setItems((prev) => [item, ...prev]);
    resetForm();

    // TODO: POST /api/materials (multipart), store in S3/GCS, save metadata in DB
  };

  const toggleArchive = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, archived: !it.archived } : it))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <>
      {/* Page Heading */}
      <div className="mb-3">
        <h1 className="text-lg font-semibold tracking-tight">
          Use your materials to teach your team
        </h1>
      </div>

      {/* ---------------- Context Card ---------------- */}
      <Card>
        <h2 className="text-xl font-bold">Context</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Add information about your organization, team, and high-level goals.
        </p>

        <div className="mt-3">
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g., Youth Club North · U12 teams · Focus on inclusivity and open questioning this season…"
            className={cn(
              "min-h-28 w-full resize-vertical rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-primary",
              contextLocked && "pointer-events-none opacity-80"
            )}
            readOnly={contextLocked} // CHANGE: lock after first add
          />
        </div>

        {/* CHANGE: Bottom-left button — 'Add' before first save, then becomes 'Edit' */}
        <div className="mt-4">
          {!contextLocked ? (
            <button
              className={cn("btn-primary", !context.trim() && "opacity-50 pointer-events-none")}
              onClick={onSaveContext}
              disabled={!context.trim()}
            >
              Add
            </button>
          ) : (
            <button className="btn-primary" onClick={onEditContext}>
              Edit
            </button>
          )}
        </div>
      </Card>

      {/* ---------------- Upload Card ---------------- */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Upload document</h2>
        <p className="mt-1 text-sm text-neutral-600">
          PDFs only (for now). Give a clear title and short description so coaches know what it is.
        </p>

        {/* Drag-and-drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center",
            dragActive ? "border-primary bg-primary/5" : "border-neutral-300 bg-white"
          )}
        >
          <UploadCloud className="h-8 w-8 text-neutral-400" />
          <div className="mt-2 text-sm text-neutral-600">
            Drag & drop a PDF here, or{" "}
            <button type="button" className="text-primary underline" onClick={handlePick}>
              browse
            </button>
            .
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />

          {/* Selected file chip */}
          {file && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              <FileText className="h-4 w-4 text-neutral-500" />
              <span className="text-neutral-700">{file.name}</span>
              <button
                className="ml-1 rounded-full p-1 hover:bg-neutral-100"
                aria-label="Remove file"
                onClick={() => setFile(null)}
              >
                <X className="h-3.5 w-3.5 text-neutral-500" />
              </button>
            </div>
          )}
        </div>

        {/* Title + Description */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., "Inclusivity: Distinct Players Named"'
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-neutral-600">Description</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What it covers, how to use it…"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Upload button (Plena blue, consistent with Metrics tab) */}
        <div className="mt-4">
        <button
            className={cn(
            "btn-primary bg-primary text-white hover:bg-primary/90",  // CHANGE: force the dark blue style
            !canSubmit && "pointer-events-none opacity-50"
            )}
            onClick={handleUpload}
            disabled={!canSubmit}
        >
            + Create material
        </button>
        </div>

      </Card>

      {/* ---------------- Knowledge-base Card ---------------- */}
      <Card className="mt-4">
        <h2 className="text-xl font-bold">Knowledge-base</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Uploaded materials appear here. You can download, archive, or delete them.
        </p>

        <div className="mt-3 divide-y rounded-xl border">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">No materials yet.</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
                {/* Title + meta */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <FileText className="h-5 w-5 text-neutral-500" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">
                      {it.title}{" "}
                      {it.archived && (
                        <span className="ml-2 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-neutral-500">
                      {it.filename} · {(it.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                      {new Date(it.createdAt).toLocaleDateString()}
                    </div>
                    {it.description && (
                      <div className="truncate text-xs text-neutral-500">{it.description}</div>
                    )}
                  </div>
                </div>

                {/* CHANGE: Action buttons now use the blue style for consistency */}
                <div className="flex items-center gap-2">
                  <a
                    href={it.url ?? "#"}
                    download={it.filename}
                    className={cn("btn-primary", !it.url && "pointer-events-none opacity-50")}
                    onClick={(e) => {
                      if (!it.url) {
                        e.preventDefault();
                        alert("Demo only — no file available.");
                      }
                    }}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    Download
                  </a>

                  <button
                    type="button"
                    onClick={() => toggleArchive(it.id)}
                    className="btn-primary"
                  >
                    <Archive className="mr-1 h-4 w-4" />
                    {it.archived ? "Unarchive" : "Archive"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this material?")) removeItem(it.id);
                    }}
                    className="btn-primary"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  );
}
