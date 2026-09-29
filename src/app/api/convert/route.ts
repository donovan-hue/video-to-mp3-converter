import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_BITRATES = [128, 192, 256, 320] as const;
const MAX_FILE_SIZE = 200 * 1024 * 1024;

function getFilenameFromUrl(url: string) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() ?? "audio";
    const base = last.replace(/\.[^./]+$/, "");
    return `${base || "audio"}.mp3`;
  } catch {
    return "audio.mp3";
  }
}

function getFilenameFromFile(name: string) {
  const base = name.replace(/\.[^./]+$/, "").trim();
  return `${base || "audio"}.mp3`;
}

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  let tempDir: string | null = null;

  try {
    if (!process.env.FFMPEG_PATH) {
      return jsonError("No se encontró la ruta de FFmpeg", 500);
    }

    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);

    const contentType = req.headers.get("content-type") || "";

    let inputSource: string;
    let filename = "audio.mp3";
    let requestedBitrate: unknown;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const uploadedFile = formData.get("file");
      requestedBitrate = formData.get("bitrate");

      if (!(uploadedFile instanceof File)) {
        return jsonError("No se recibió ningún archivo MP4", 400);
      }

      if (uploadedFile.size === 0) {
        return jsonError("El archivo está vacío", 400);
      }

      if (uploadedFile.size > MAX_FILE_SIZE) {
        return jsonError("El archivo supera el límite de 200 MB", 413);
      }

      const isVideo =
        uploadedFile.type === "video/mp4" ||
        uploadedFile.type.startsWith("video/") ||
        uploadedFile.name.toLowerCase().endsWith(".mp4");

      if (!isVideo) {
        return jsonError("Solo se permiten archivos de video MP4", 400);
      }

      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mp4-to-mp3-"));

      const safeName = uploadedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const inputPath = path.join(tempDir, safeName);

      const buffer = Buffer.from(await uploadedFile.arrayBuffer());
      await fs.writeFile(inputPath, buffer);

      inputSource = inputPath;
      filename = getFilenameFromFile(uploadedFile.name);
    } else {
      const body = (await req.json()) as {
        url?: string;
        bitrate?: number;
      };

      requestedBitrate = body.bitrate;

      if (!body.url || typeof body.url !== "string") {
        return jsonError("Falta 'url' en el cuerpo de la solicitud", 400);
      }

      let parsed: URL;

      try {
        parsed = new URL(body.url);

        if (!/^https?:$/.test(parsed.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return jsonError("URL inválida. Usa http(s)://", 400);
      }

      inputSource = parsed.toString();
      filename = getFilenameFromUrl(body.url);
    }

    const bitrate = Number(requestedBitrate ?? 192);

    if (
      !Number.isInteger(bitrate) ||
      !ALLOWED_BITRATES.includes(
        bitrate as (typeof ALLOWED_BITRATES)[number],
      )
    ) {
      return jsonError(
        "Bitrate inválido. Usa 128, 192, 256 o 320 kbps.",
        400,
      );
    }

    const pass = new (await import("stream")).PassThrough();

    const cleanup = async () => {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        tempDir = null;
      }
    };

    const cmd = ffmpeg(inputSource)
      .noVideo()
      .format("mp3")
      .audioBitrate(bitrate)
      .on("error", async (err) => {
        await cleanup();
        pass.destroy(err);
      })
      .on("end", async () => {
        await cleanup();
        pass.end();
      });

    cmd.pipe(pass, { end: true });

    const webStream = (Readable as any).toWeb
      ? (Readable as any).toWeb(pass)
      : (pass as any);

    return new Response(webStream as any, {
      headers: {
        "content-type": "audio/mpeg",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        error: "Falló la conversión",
        details: String(err?.message || err),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
