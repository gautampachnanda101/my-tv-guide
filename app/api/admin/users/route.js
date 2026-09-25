import { auth } from "@/auth";
import { listUserAccounts, setUserSubscribed } from "@/lib/sources/userStreams";

// Don't log GitHub logins here (PII) - errors below are surfaced to the
// admin via the redirect/response, not the server console.

function isAdmin(request) {
  return Boolean(request.auth?.user?.isAdmin);
}

export const GET = auth(async (request) => {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ users: await listUserAccounts() });
});

export const POST = auth(async (request) => {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => null)
    : Object.fromEntries((await request.formData()).entries());

  const githubLogin = String(body?.githubLogin || "").trim().toLowerCase();
  const subscribed = body?.subscribed === "true" || body?.subscribed === true;
  if (!githubLogin) return Response.json({ error: "Missing githubLogin." }, { status: 400 });

  await setUserSubscribed(githubLogin, subscribed);
  return Response.redirect(new URL("/admin", request.url));
});
