import { auth } from "@/auth";
import { addGlobalSource, deleteGlobalSource, isSourceStoreAvailable, listGlobalSources, normalizeSourceUrl } from "@/lib/sources/store";

function isAdmin(request) {
  return Boolean(request.auth?.user?.isAdmin);
}

export const GET = auth(async (request) => {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ configured: isSourceStoreAvailable(), sources: await listGlobalSources() });
});

export const POST = auth(async (request) => {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSourceStoreAvailable()) return Response.json({ error: "Turso source storage is not configured." }, { status: 503 });

  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => null)
    : Object.fromEntries((await request.formData()).entries());
  if (body?._method === "delete") {
    if (!body.id) return Response.json({ error: "Missing source id." }, { status: 400 });
    await deleteGlobalSource(String(body.id));
    return Response.redirect(new URL("/admin", request.url));
  }
  const name = String(body?.name || "").trim();
  const type = String(body?.type || "").trim();
  const url = String(body?.url || "").trim();
  if (!name || !["playlist", "xmltv"].includes(type) || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "Enter a name, source type, and valid HTTP(S) URL." }, { status: 400 });
  }

  let source;
  try {
    source = await addGlobalSource({ name, type, url: normalizeSourceUrl(url) });
  } catch (error) {
    if (error?.code === "DUPLICATE_SOURCE_URL" || error?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      if (!contentType.includes("application/json")) {
        return Response.redirect(new URL(`/admin?error=${encodeURIComponent("A source with this URL already exists.")}`, request.url));
      }
      return Response.json({ error: "A source with this URL already exists." }, { status: 409 });
    }
    throw error;
  }
  if (!contentType.includes("application/json")) {
    return Response.redirect(new URL("/admin", request.url));
  }
  return Response.json({ source }, { status: 201 });
});

export const DELETE = auth(async (request) => {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing source id." }, { status: 400 });
  await deleteGlobalSource(id);
  return Response.json({ ok: true });
});