export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "video-to-mp3-converter",
  });
}
