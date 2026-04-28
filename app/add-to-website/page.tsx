"use client";

import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

export default function EmbedPage() {
  const [website, setWebsite] = useState("");
  const [pollText, setPollText] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);
    setSuccess(false);
    setError("");

    try {
      const response = await fetch("/api/embed-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          website: website.trim(),
          pollText: pollText.trim(),
          email: email.trim(),
          source: "embed page",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not submit request.");
      }

      setSuccess(true);
      setWebsite("");
      setPollText("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={styles.main}>
      <section style={styles.center}>
        <h1 style={styles.h1}>Add Poll &amp; See to your website</h1>
        <p style={styles.h2}>Turn visitors into participants in seconds</p>

        <img
          src="/embed-assets/plm-before.png"
          alt="Poll & See embedded on a website"
          style={styles.heroImg}
        />
      </section>

      <section style={styles.center}>
        <h2 style={styles.h3}>See how it works on real websites</h2>

        <img
          src="/embed-assets/plm-before.png"
          alt="Poll & See embed example before voting"
          style={styles.img}
        />
        <img
          src="/embed-assets/plm-after.png"
          alt="Poll & See embed example after voting"
          style={styles.img}
        />
        <img
          src="/embed-assets/diamant-before.png"
          alt="Poll & See embedded on another website"
          style={styles.img}
        />
      </section>

      <section style={styles.center}>
        <p style={styles.oneLine}>Works instantly. No signup. Just add and go.</p>
      </section>

      <section style={styles.center}>
        <h3 style={styles.h3}>Get this on your site</h3>
        <p style={styles.sub}>Early access — free while we’re testing</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          <input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="yourwebsite.com"
            required
            style={styles.input}
          />

          <textarea
            value={pollText}
            onChange={(event) => setPollText(event.target.value)}
            placeholder="Write your question + options (e.g. What matters most… Price / Quality / Speed)"
            required
            style={styles.textarea}
          />

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="your@email.com"
            required
            style={styles.input}
          />

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? "Sending..." : "Request access"}
          </button>
        </form>

        {success ? (
          <p style={styles.success}>
            We’ll set this up and send everything you need to get live.
          </p>
        ) : null}

        {error ? <p style={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "sans-serif",
  },
  center: {
    textAlign: "center",
    marginBottom: "60px",
  },
  h1: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "10px",
  },
  h2: {
    fontSize: "18px",
    color: "#555",
    marginBottom: "30px",
  },
  h3: {
    fontSize: "22px",
    marginBottom: "20px",
  },
  heroImg: {
    width: "100%",
    maxWidth: "900px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  img: {
    width: "100%",
    maxWidth: "800px",
    marginBottom: "25px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  },
  oneLine: {
    fontSize: "16px",
    color: "#666",
  },
  sub: {
    fontSize: "14px",
    color: "#777",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxWidth: "500px",
    margin: "0 auto",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  textarea: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    minHeight: "90px",
  },
  button: {
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    background: "#000",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  success: {
    marginTop: "15px",
    fontSize: "13px",
    color: "#166534",
  },
  error: {
    marginTop: "15px",
    fontSize: "13px",
    color: "#b91c1c",
  },
};