import { signIn } from "@/auth";

export default function AdminSignInPage() {
  return (
    <main className="page-shell" style={{ maxWidth: 640, margin: "0 auto" }}>
      <section className="panel">
        <p className="eyebrow">Admin</p>
        <h1>Source administration</h1>
        <p className="subhead">Sign in with the approved GitHub account to view global source configuration.</p>
        <form action={async () => { "use server"; await signIn("github", { redirectTo: "/admin" }); }}>
          <button type="submit" className="cta cta-primary">Continue with GitHub</button>
        </form>
      </section>
    </main>
  );
}
