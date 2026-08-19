"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const SKIP_COOKIE = "tvguide_setup_skipped";

function setSkipCookie() {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${SKIP_COOKIE}=1; path=/; max-age=${oneYear}; SameSite=Lax`;
}

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState({});
  const [saving, setSaving] = useState({});
  const [messages, setMessages] = useState({});

  useEffect(() => {
    fetch("/api/setup/status")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (name) => {
    const value = (inputs[name] || "").trim();
    if (!value) return;

    setSaving((s) => ({ ...s, [name]: true }));
    setMessages((m) => ({ ...m, [name]: null }));

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [name]: value })
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => ({ ...m, [name]: { type: "error", text: data.error || "Failed to save." } }));
      } else {
        const result = data.results?.[name];
        if (result?.saved) {
          setMessages((m) => ({ ...m, [name]: { type: "success", text: "Saved and verified." } }));
          setStatus(data.status);
          setInputs((i) => ({ ...i, [name]: "" }));
        } else {
          setMessages((m) => ({ ...m, [name]: { type: "error", text: result?.error || "Could not verify this key." } }));
        }
      }
    } catch {
      setMessages((m) => ({ ...m, [name]: { type: "error", text: "Network error while saving." } }));
    } finally {
      setSaving((s) => ({ ...s, [name]: false }));
    }
  };

  const handleSkip = () => {
    setSkipCookie();
    router.push("/");
  };

  const handleContinue = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>Loading setup…</div>
      </div>
    );
  }

  const credentials = status?.credentials || [];
  const persistenceAvailable = status?.persistenceAvailable ?? true;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome to My TV Guide</h1>
        <p className={styles.subtitle}>
          TV schedules work out of the box. Connect a couple of free APIs below to unlock show posters,
          ratings, and free movies — this only takes a minute.
        </p>

        {!persistenceAvailable && (
          <div className={styles.notice}>
            This deployment&apos;s filesystem is read-only, so keys can&apos;t be saved here. Add them as
            environment variables in your Vercel project settings instead, then redeploy.
          </div>
        )}

        <div className={styles.grid}>
          {credentials.map((cred) => (
            <div key={cred.name} className={styles.credCard}>
              <div className={styles.credHeader}>
                <h2 className={styles.credLabel}>{cred.label}</h2>
                {cred.source && <span className={styles.badge}>✅ {cred.source === "env" ? "Configured via environment" : "Configured"}</span>}
              </div>
              <p className={styles.credDescription}>{cred.description}</p>
              <a href={cred.signupUrl} target="_blank" rel="noreferrer" className={styles.link}>
                Get a free key →
              </a>

              {persistenceAvailable && cred.source !== "env" && (
                <div className={styles.inputRow}>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="Paste your API key"
                    value={inputs[cred.name] || ""}
                    onChange={(e) => setInputs((i) => ({ ...i, [cred.name]: e.target.value }))}
                  />
                  <button
                    className={styles.saveButton}
                    disabled={saving[cred.name] || !(inputs[cred.name] || "").trim()}
                    onClick={() => handleSave(cred.name)}
                  >
                    {saving[cred.name] ? "Checking…" : cred.source === "stored" ? "Update" : "Save"}
                  </button>
                </div>
              )}

              {messages[cred.name] && (
                <p className={messages[cred.name].type === "error" ? styles.errorText : styles.successText}>
                  {messages[cred.name].text}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.skipButton} onClick={handleSkip}>
            Skip for now
          </button>
          <button className={styles.continueButton} onClick={handleContinue}>
            Continue to My TV Guide
          </button>
        </div>
      </div>
    </div>
  );
}
