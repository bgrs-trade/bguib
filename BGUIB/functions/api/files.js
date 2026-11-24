import { jsonResponse, verifyToken } from "../_utils.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.BUCKET) {
    return jsonResponse({ error: "Cloudflare R2 Bucket (BUCKET) binding is not configured." }, 500);
  }

  // GET: Download / Serve file from R2
  if (request.method === "GET") {
    const key = url.searchParams.get("key");
    if (!key) return jsonResponse({ error: "Missing file key." }, 400);

    const object = await env.BUCKET.get(key);
    if (!object) {
      return new Response("File not found in R2 storage.", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Content-Disposition", `inline; filename="${key.split("/").pop()}"`);
    return new Response(object.body, { headers });
  }

  // POST: Upload file to R2 (Allowed for Staff/Admin OR Citizen E-Service Attachment)
  if (request.method === "POST") {
    const isCitizenUpload = url.searchParams.get("public") === "1";
    if (!isCitizenUpload) {
      const user = await verifyToken(request, env);
      if (!user) {
        return jsonResponse({ error: "Sign in required to upload institutional files." }, 401);
      }
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = (formData.get("folder") || "documents").replace(/[^a-zA-Z0-9_-]/g, "");

    if (!file || typeof file === "string") {
      return jsonResponse({ error: "No valid file provided in form-data." }, 400);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${folder}/${Date.now()}-${safeName}`;

    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream"
      }
    });

    const sizeKB = Math.max(1, Math.round(file.size / 1024));
    const formattedSize = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    const ext = safeName.split(".").pop().toUpperCase();

    return jsonResponse({
      success: true,
      file_key: key,
      file_name: file.name,
      file_url: `/api/files?key=${encodeURIComponent(key)}`,
      size: formattedSize,
      format: ext
    });
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}
