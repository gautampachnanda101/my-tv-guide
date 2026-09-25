import Link from "next/link";
import { auth, signIn } from "@/auth";
import { isUserStoreAvailable, listUserStreams } from "@/lib/sources/userStreams";

export default async function SourcesPage({ searchParams }) {
  const session = await auth();
  const params = await searchParams;
  const errorMessage = params?.error ? String(params.error) : "";
  const streams = session?.user?.subscribed ? await listUserStreams(session.user.githubLogin) : [];

  return (
    <main className="page-shell" style={{ maxWidth: 960, margin: "0 auto" }}>
      <p className="eyebrow">Personal sources</p>
      <h1>My streams</h1>
      <p><Link className="watch-link" href="/">Back to guide</Link></p>

      <section className="panel legal-warning" style={{ marginTop: "1rem" }}>
        <h2>Before you add a stream</h2>
        <p>
          This is a bring-your-own-source feature. We do not host, provide, verify, or endorse any stream you add here -
          you are solely responsible for ensuring you have the legal right to access and use it. Adding or streaming
          content you are not licensed to access may be illegal in your country. Remove any stream immediately if you
          are unsure of its legality.
        </p>
      </section>

      {!session?.user ? (
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>Sign in required</h2>
          <p className="subhead">Personal streams are a subscriber feature tied to your account, so you can reach them from any device.</p>
          <form action={async () => { "use server"; await signIn("github", { redirectTo: "/sources" }); }}>
            <button type="submit" className="cta cta-primary">Continue with GitHub</button>
          </form>
        </section>
      ) : !session.user.subscribed ? (
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>Subscriber feature</h2>
          <p className="subhead">Signed in as {session.user.githubLogin}. Personal streams aren&apos;t enabled on your account yet - contact the admin to enable them.</p>
        </section>
      ) : (
        <>
          <section className="panel" style={{ marginTop: "1rem" }}>
            <h2>Add a stream</h2>
            {errorMessage ? <p className="state error" role="alert">{errorMessage}</p> : null}
            {!isUserStoreAvailable() ? (
              <p className="state error" role="alert">Storage is not configured on this deployment.</p>
            ) : (
              <form action="/api/my-streams" method="post" className="controls-grid" style={{ marginTop: "1rem" }}>
                <label className="control-item">
                  <span>Name</span>
                  <input name="name" placeholder="My sports playlist" required />
                </label>
                <label className="control-item">
                  <span>Source type</span>
                  <select name="type" defaultValue="stream">
                    <option value="stream">Direct stream</option>
                    <option value="playlist">M3U playlist</option>
                  </select>
                </label>
                <label className="control-item">
                  <span>URL</span>
                  <input name="url" required type="url" placeholder="https://example.com/channel.m3u8" />
                </label>
                <label className="control-item legal-ack">
                  <input name="acknowledgedLegalWarning" type="checkbox" required />
                  <span>I confirm I have the legal right to access this stream. I understand this app does not host, verify, or take responsibility for it.</span>
                </label>
                <button className="cta cta-primary" type="submit">Save stream</button>
              </form>
            )}
          </section>

          <section className="panel" style={{ marginTop: "1rem" }}>
            <h2>Your streams</h2>
            {streams.length === 0 ? <p className="state">No personal streams yet.</p> : (
              <div className="source-grid" style={{ marginTop: "1rem" }}>
                {streams.map((source) => (
                  <article className="panel" key={source.id}>
                    <h3>{source.name}</h3>
                    <p className="meta">{source.type === "stream" ? "Direct stream" : "M3U playlist"}</p>
                    <p className="meta">Not verified - use at your own risk</p>
                    <div className="detail-actions">
                      <a
                        className="cta cta-primary"
                        href={source.type === "stream" ? source.url : `/api/playlist?url=${encodeURIComponent(source.url)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.type === "stream" ? "Open stream" : "Preview playlist"}
                      </a>
                      <form action="/api/my-streams" method="post">
                        <input type="hidden" name="_method" value="delete" />
                        <input type="hidden" name="id" value={source.id} />
                        <button className="cta cta-secondary" type="submit">Remove</button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
