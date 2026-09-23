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

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/admin")}`);

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
        <p className="state">These sources are global and affect every user after deployment configuration changes.</p>
        <div className="source-grid" style={{ marginTop: "1rem" }}>
          {configuredSources().map((source) => (
            <article className="panel" key={`${source.name}-${source.kind}`}>
              <h3>{source.name}</h3>
              <p className="meta">{source.kind}</p>
              <p className="availability-tag">{source.status}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
