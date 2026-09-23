import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

function parseObjectEnv(name) {
  try {
    const value = JSON.parse(process.env[name] || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function configuredSources() {
  const playlists = parseObjectEnv("IPTV_CHANNEL_PLAYLIST_MAP");
  const feeds = parseObjectEnv("OPEN_XMLTV_FEEDS");
  return [
    { name: "IPTV-org", kind: "Public catalogue and streams", status: "Enabled" },
    { name: "TVMaze", kind: "Public schedule fallback", status: "Enabled" },
    { name: "UK XMLTV", kind: "Schedule feed", status: process.env.OPEN_XMLTV_UK_URL ? "Configured" : "Default feed" },
    ...Object.keys(feeds).map((code) => ({ name: `XMLTV ${code}`, kind: "Schedule feed", status: "Configured" })),
    ...Object.keys(playlists).map((key) => ({ name: key, kind: "Configured M3U playlist", status: "Configured" }))
  ];
}

export default async function AdminPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/admin")}`);
  const params = await searchParams;
  const errorMessage = params?.error ? String(params.error) : "";
  const sourceStore = await import("@/lib/sources/store");
  const globalSources = await sourceStore.listGlobalSources();

  return (
    <main className="page-shell" style={{ maxWidth: 960, margin: "0 auto" }}>
      <header className="section-title-row">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Global sources</h1>
          <p className="subhead">Signed in as {session.user.githubLogin}. Secrets stay on the server.</p>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
          <button type="submit" className="cta cta-secondary">Sign out</button>
        </form>
      </header>
      <section className="panel" style={{ marginTop: "1.5rem" }}>
        <h2>Configured sources</h2>
        <p className="state">These sources are global and stored in Turso for every user.</p>
        {errorMessage ? <p className="state error" role="alert">{errorMessage}</p> : null}
        <form action="/api/admin/sources" method="post" className="controls-grid admin-source-form" style={{ marginTop: "1rem" }}>
          <label className="control-item">
            <span>Name</span>
            <input name="name" required placeholder="UK sports playlist" />
          </label>
          <label className="control-item">
            <span>Type</span>
            <select name="type" defaultValue="playlist">
              <option value="playlist">M3U playlist</option>
              <option value="xmltv">XMLTV schedule</option>
            </select>
          </label>
          <label className="control-item">
            <span>URL</span>
            <input name="url" type="url" required placeholder="https://example.com/source.m3u" />
          </label>
          <button className="cta cta-primary" type="submit">Add source</button>
        </form>
        <div className="source-grid" style={{ marginTop: "1rem" }}>
          {[...globalSources.map((source) => ({
            ...source,
            kind: source.type === "playlist" ? "M3U playlist" : "XMLTV schedule",
            status: "Managed in Turso"
          })), ...configuredSources()].map((source) => (
            <article className="panel" key={`${source.name}-${source.kind}`}>
              <h3>{source.name}</h3>
              <p className="meta">{source.kind || source.type}</p>
              {source.url ? <p className="meta">{source.url}</p> : null}
              <p className="availability-tag">{source.status}</p>
              {source.id ? (
                <form action="/api/admin/sources" method="post">
                  <input type="hidden" name="_method" value="delete" />
                  <input type="hidden" name="id" value={source.id} />
                  <button className="cta cta-secondary" type="submit">Remove</button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
