import { promises as fs } from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPE: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  // prevent path traversal — only allow a bare filename
  if (!file || file.includes("/") || file.includes("\\") || file.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(file).toLowerCase();
  const contentType = CONTENT_TYPE[ext];
  if (!contentType) {
    return new Response("Unsupported media type", { status: 415 });
  }

  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, file));
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
