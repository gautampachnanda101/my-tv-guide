import { auth } from "@/auth";
import { addUserStream, deleteUserStream, isUserStoreAvailable, listUserStreams } from "@/lib/sources/userStreams";

// Never log request bodies, stream URLs, or GitHub logins in this file -
// IPTV URLs often embed credentials, and logins are PII. Only log generic,
// non-identifying error messages if something needs to be logged at all.

function currentUser(request) {
  const user = request.auth?.user;
  if (!user?.githubLogin) return null;
  return user;
}

export const GET = auth(async (request) => {
  const user = currentUser(request);
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!user.subscribed) return Response.json({ error: "This feature requires a subscribed account." }, { status: 403 });
  if (!isUserStoreAvailable()) return Response.json({ error: "Storage is not configured." }, { status: 503 });

  const streams = await listUserStreams(user.githubLogin);
  return Response.json({ streams });
});

export const POST = auth(async (request) => {
  const user = currentUser(request);
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (!user.subscribed) return Response.json({ error: "This feature requires a subscribed account." }, { status: 403 });
  if (!isUserStoreAvailable()) return Response.json({ error: "Storage is not configured." }, { status: 503 });

  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => null)
    : Object.fromEntries((await request.formData()).entries());

  if (body?._method === "delete") {
    if (!body.id) return Response.json({ error: "Missing stream id." }, { status: 400 });
    await deleteUserStream({ githubLogin: user.githubLogin, id: String(body.id) });
    return Response.redirect(new URL("/sources", request.url));
  }

  const name = String(body?.name || "").trim();
  const type = String(body?.type || "").trim();
  const url = String(body?.url || "").trim();
  const acknowledgedLegalWarning = body?.acknowledgedLegalWarning === "on" || body?.acknowledgedLegalWarning === true;

  if (!name || !["stream", "playlist"].includes(type) || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "Enter a name, source type, and valid HTTP(S) URL." }, { status: 400 });
  }
  if (!acknowledgedLegalWarning) {
    return Response.json({ error: "You must confirm the legal notice before adding a stream." }, { status: 400 });
  }

  await addUserStream({ githubLogin: user.githubLogin, name, type, url });
  return Response.redirect(new URL("/sources", request.url));
});
