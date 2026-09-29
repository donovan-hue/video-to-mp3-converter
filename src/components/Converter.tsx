"use client";

import { useState } from "react";

const MP3_QUALITIES = [
  { value: 128, label: "128 kbps", description: "Archivo pequeño" },
  { value: 192, label: "192 kbps", description: "Equilibrio recomendado" },
  { value: 256, label: "256 kbps", description: "Alta calidad" },
  { value: 320, label: "320 kbps", description: "Máxima calidad MP3" },
] as const;

export default function Converter() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [bitrate, setBitrate] = useState(192);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("audio.mp3");

  async function convert() {
    setError(null);
    setLoading(true);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      let res: Response;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bitrate", String(bitrate));

        res = await fetch("/api/convert", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/convert", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url, bitrate }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const filename =
        (res.headers.get("content-disposition") || "audio.mp3").match(
          /filename="?([^";]+)"?/i,
        )?.[1] || "audio.mp3";

      setAudioUrl(objectUrl);
      setDownloadName(filename);
    } catch (err: any) {
      setError(err?.message || "Fallo la conversión");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file && !url.trim()) {
      setError("Selecciona un MP4 o introduce una URL.");
      return;
    }

    void convert();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;

    setError(null);
    setFile(selected);

    if (selected) {
      setUrl("");
    }
  }

  function download() {
    if (!audioUrl) return;

    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">
          Archivo MP4
        </span>

        <input
          type="file"
          accept="video/mp4,video/*"
          onChange={handleFileChange}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base"
        />

        {file && (
          <span className="text-sm text-slate-600">
            Seleccionado: {file.name}
          </span>
        )}
      </label>

      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="h-px flex-1 bg-slate-200" />
        <span>o usa una URL</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">
          Enlace de video MP4
        </span>

        <input
          type="url"
          placeholder="https://.../video.mp4"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (e.target.value) setFile(null);
          }}
          disabled={!!file}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
        />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-slate-700">
          Calidad MP3
        </legend>

        <div className="grid gap-2">
          {MP3_QUALITIES.map((quality) => (
            <label
              key={quality.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50"
            >
              <input
                type="radio"
                name="bitrate"
                value={quality.value}
                checked={bitrate === quality.value}
                onChange={() => setBitrate(quality.value)}
              />

              <span className="flex flex-1 items-center justify-between gap-4">
                <span className="font-medium text-slate-900">
                  {quality.label}
                </span>

                <span className="text-sm text-slate-500">
                  {quality.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Convirtiendo..." : "Convertir a MP3"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {audioUrl && (
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="font-medium text-slate-900">MP3 listo</h2>

          <audio controls src={audioUrl} className="w-full">
            Tu navegador no puede reproducir este audio.
          </audio>

          <button
            type="button"
            onClick={download}
            className="rounded-lg bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
          >
            Descargar MP3
          </button>
        </section>
      )}

      <p className="text-xs text-slate-500">
        Puedes seleccionar un MP4 del teléfono o convertir un video mediante
        una URL. El resultado siempre será MP3.
      </p>
    </form>
  );
}
