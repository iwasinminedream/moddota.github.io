import React, { useState, useEffect, useMemo } from "react";
import { NavBar } from "../layout/NavBar";

const CHANGELOG_BASE = "https://raw.githubusercontent.com/iwasinminedream/dota-data/master";

interface ChangelogIndex {
  versions: string[];
}

export function ChangelogPage() {
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [changelog, setChangelog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${CHANGELOG_BASE}/changelog-index.json`)
      .then((r) => r.json())
      .then((data: ChangelogIndex) => {
        setVersions(data.versions);
        // Get version from URL or default to first
        const path = window.location.pathname;
        const match = path.match(/changelog\/(.+)/);
        const version = match ? match[1] : data.versions[0];
        setSelectedVersion(version);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVersion) return;
    setLoading(true);
    fetch(`${CHANGELOG_BASE}/changelogs/${selectedVersion}.json`)
      .then((r) => r.json())
      .then((data) => { setChangelog(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedVersion]);

  const base = typeof window !== "undefined" ? document.querySelector("base")?.getAttribute("href") || "" : "";

  return (
    <>
      <NavBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
        <div style={{ width: 340, height: "100%", overflowY: "scroll", padding: "2px 12px" }} className="api-sidebar">
          {versions.map((v) => (
            <a
              key={v}
              href={`${base}api/changelog/${v}`}
              onClick={(e) => { e.preventDefault(); setSelectedVersion(v); window.history.pushState({}, "", `${base}api/changelog/${v}`); }}
              style={{
                background: selectedVersion === v ? "var(--color-sidebar-hover)" : "var(--color-sidebar)",
                borderBottom: selectedVersion === v ? "3px solid var(--color-highlight)" : "3px solid transparent",
                borderRadius: 3, padding: "2px 8px 0 8px", textDecoration: "none", color: "var(--color-text)",
                fontWeight: selectedVersion === v ? 600 : "normal", display: "block", fontSize: 14, marginBottom: 3,
              }}
            >
              {v}
            </a>
          ))}
        </div>
        <main style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", padding: "24px" }}>
          {loading ? (
            <div style={{ marginTop: 50, alignSelf: "center", fontSize: 24 }}>Loading...</div>
          ) : changelog ? (
            <div>
              <h2 style={{ fontSize: 24, marginBottom: 16 }}>Changelog {selectedVersion}</h2>
              <pre style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--color-text)", background: "var(--color-group)", padding: 16, borderRadius: 4, border: "1px solid var(--color-group-border)" }}>
                {JSON.stringify(changelog, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ marginTop: 50, alignSelf: "center", fontSize: 24 }}>
              {versions.length === 0 ? "Failed to load changelog index" : "Select a version"}
            </div>
          )}
        </main>
      </div>
      <style>{`
        @media (max-width: 1100px) { .api-sidebar { width: 200px !important; } }
        @media (max-width: 768px) { .api-sidebar { width: 100% !important; max-height: 40vh; border-bottom: 1px solid var(--color-group-border); } .api-page-content { flex-direction: column; } }
      `}</style>
    </>
  );
}
