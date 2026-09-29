import Converter from "@/components/Converter";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-[0_24px_60px_rgba(16,24,40,0.12)]">
        <p className="m-0 text-sm uppercase tracking-[0.08em] text-slate-600">
          Herramienta
        </p>

        <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] text-slate-950">
          Convertir MP4 a MP3
        </h1>

        <p className="mt-4 text-base text-slate-700">
          Pega un enlace de video MP4 y te devolveremos un MP3 descargable,
          procesado en el servidor con ffmpeg.
        </p>

        <Converter />
      </section>
    </main>
  );
}
