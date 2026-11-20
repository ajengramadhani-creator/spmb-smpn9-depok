"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropzone({
  onFiles,
  accept = ".pdf,.jpg,.jpeg,.png",
  multiple = false,
  maxSizeMb = 5,
  prompt = "Klik untuk memilih atau jatuhkan berkas ke sini",
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  prompt?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  function acceptFiles(incoming: FileList | null) {
    if (!incoming) return;
    const selected = Array.from(incoming);
    const allowedExtensions = accept.split(",").map((extension) => extension.trim().toLowerCase());
    const invalidFile = selected.find((file) => !allowedExtensions.includes(`.${file.name.split(".").pop()?.toLowerCase() ?? ""}`));
    if (invalidFile) {
      setError(`${invalidFile.name} memiliki format yang tidak didukung.`);
      return;
    }
    const tooLarge = selected.find((file) => file.size > maxSizeMb * 1024 * 1024);
    if (tooLarge) {
      setError(`${tooLarge.name} melebihi batas ${maxSizeMb} MB.`);
      return;
    }
    const nextFiles = multiple ? [...files, ...selected] : selected.slice(0, 1);
    setFiles(nextFiles);
    setError("");
    onFiles(nextFiles);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFiles(event.dataTransfer.files);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Pilih atau jatuhkan berkas untuk diunggah"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn("cursor-pointer rounded-xl border-2 border-dashed px-5 py-8 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary", dragging ? "border-primary bg-pale" : "border-slate-300 hover:border-primary/60 hover:bg-slate-50")}
      >
        <FileUp aria-hidden="true" className="mx-auto size-7 text-primary" />
        <p className="mt-3 text-sm font-medium text-slate-800">{prompt}</p>
        <p className="mt-1 text-xs text-slate-500">Format {accept.replaceAll(",", ", ")} · Maksimal {maxSizeMb} MB</p>
        <input ref={inputRef} className="sr-only" type="file" accept={accept} multiple={multiple} onChange={(event) => { acceptFiles(event.target.files); event.target.value = ""; }} />
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      {files.length > 0 && <ul className="mt-3 space-y-2">{files.map((file) => <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2 text-sm text-slate-700"><FileText aria-hidden="true" className="size-4 text-slate-400" />{file.name}</li>)}</ul>}
    </div>
  );
}