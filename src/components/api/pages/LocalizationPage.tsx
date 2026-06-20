import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  dotaLanguages,
  dotaLanguagesData,
  type DotaLanguage,
} from "@moddota/dota-data/lib/localization/languages";
import { LazyList } from "../Lists";
import { useCtrlFHook } from "../Search";
import { NavBar } from "../layout/NavBar";

// ─── Data loading ───────────────────────────────────────────────────────────────
// Localization files are large (~10MB each) and there are 28 of them, so they are
// fetched at runtime per-language instead of being bundled — mirroring the approach
// in ChangelogPage. In dev they are served from the sibling dota-data repo via the
// `/localization-data` vite middleware; in production from the dota-data raw files.

const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
const LOCALIZATION_BASE = isDev
  ? "/localization-data"
  : "https://raw.githubusercontent.com/iwasinminedream/dota-data/master/files/localization";

const DEFAULT_LANGUAGE: DotaLanguage = "english";

// Pin the most-used languages to the top of the sidebar, above the rest.
const PRIORITY_LANGUAGES: readonly DotaLanguage[] = ["russian", "english"];
const orderedLanguages: DotaLanguage[] = [
  ...PRIORITY_LANGUAGES,
  ...dotaLanguages.filter((lang) => !PRIORITY_LANGUAGES.includes(lang)),
];

interface LocalizationEntry {
  key: string;
  value: string;
  keyLower: string;
  valueLower: string;
  group: string;
}

interface Block {
  id: string;
  entries: LocalizationEntry[];
}

// Cache parsed + grouped entries per language so switching back is instant.
const entryCache = new Map<DotaLanguage, LocalizationEntry[]>();

// Assigns each entry a `group` key so related tokens render together as a block:
//  - If a longer-existing key is a prefix (e.g. the ability name
//    `DOTA_Tooltip_ability_nevermore_dark_lord` for `..._presence`), group under it.
//  - Otherwise, if the key itself is a base that other keys nest under, it is its own group.
//  - Otherwise, fall back to the key minus its last segment so flat families
//    (e.g. `dota_ability_variable_*`) still cluster together.
function assignGroups(entries: LocalizationEntry[]): void {
  // Map lowercased key -> actual key so prefix matching is case-insensitive. Valve
  // mixes casing across related tokens (e.g. the item name
  // `DOTA_Tooltip_Ability_item_falcon_blade` vs its fields
  // `DOTA_Tooltip_ability_item_falcon_blade_Lore`), which would otherwise split one
  // entity into several blocks.
  const keyByLower = new Map<string, string>();
  for (const e of entries) {
    if (!keyByLower.has(e.keyLower)) keyByLower.set(e.keyLower, e.key);
  }

  const anchorParent = new Map<string, string | null>();
  const parents = new Set<string>();

  for (const e of entries) {
    const parts = e.keyLower.split("_");
    let parent: string | null = null;
    for (let i = parts.length - 1; i >= 1; i--) {
      const prefixLower = parts.slice(0, i).join("_");
      const actual = keyByLower.get(prefixLower);
      if (actual && actual !== e.key) {
        parent = actual;
        break;
      }
    }
    anchorParent.set(e.key, parent);
    if (parent) parents.add(parent);
  }

  for (const e of entries) {
    const parent = anchorParent.get(e.key) ?? null;
    if (parent) {
      e.group = parent;
    } else if (parents.has(e.key)) {
      e.group = e.key;
    } else {
      const idx = e.key.lastIndexOf("_");
      e.group = idx > 0 ? e.key.slice(0, idx) : e.key;
    }
  }
}

function prepareEntries(raw: Record<string, string>): LocalizationEntry[] {
  const entries = Object.entries(raw)
    .map(([key, value]): LocalizationEntry => {
      const str = typeof value === "string" ? value : String(value);
      return { key, value: str, keyLower: key.toLowerCase(), valueLower: str.toLowerCase(), group: key };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
  assignGroups(entries);
  return entries;
}

async function loadLanguage(language: DotaLanguage): Promise<LocalizationEntry[]> {
  const cached = entryCache.get(language);
  if (cached) return cached;
  const response = await fetch(`${LOCALIZATION_BASE}/${language}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const raw = (await response.json()) as Record<string, string>;
  const entries = prepareEntries(raw);
  entryCache.set(language, entries);
  return entries;
}

// ─── Search ───────────────────────────────────────────────────────────────────--

type SearchScope = "both" | "key" | "value";

const scopeOptions: { key: SearchScope; label: string }[] = [
  { key: "both", label: "Both" },
  { key: "key", label: "Keys" },
  { key: "value", label: "Values" },
];

function filterEntries(entries: LocalizationEntry[], query: string, scope: SearchScope): LocalizationEntry[] {
  const q = query.toLowerCase();
  const matchKey = scope !== "value";
  const matchValue = scope !== "key";
  return entries.filter(
    (e) => (matchKey && e.keyLower.includes(q)) || (matchValue && e.valueLower.includes(q)),
  );
}

// Group a (possibly filtered) entry list into ordered blocks. Entry `group` is
// precomputed over the full key set, so grouping is consistent regardless of filtering.
function buildBlocks(entries: LocalizationEntry[]): Block[] {
  const map = new Map<string, LocalizationEntry[]>();
  for (const e of entries) {
    let arr = map.get(e.group);
    if (!arr) {
      arr = [];
      map.set(e.group, arr);
    }
    arr.push(e);
  }
  const blocks: Block[] = [];
  for (const [id, es] of map) {
    es.sort((a, b) => {
      if (a.key === id) return -1; // the base/name key heads the block
      if (b.key === id) return 1;
      return a.key.localeCompare(b.key);
    });
    blocks.push({ id, entries: es });
  }
  blocks.sort((a, b) => a.id.localeCompare(b.id));
  return blocks;
}

// Highlight the first occurrence of the query inside the text.
function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "var(--color-highlight)", color: "#000", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Clipboard ──────────────────────────────────────────────────────────────────

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  fallbackCopy(text);
  return Promise.resolve();
}

function fallbackCopy(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* ignore */
  }
  document.body.removeChild(ta);
}

// Re-escape control characters back to their KV-file form. The localization JSON
// stores them as real characters (vdf unescaped \n, \r, \t when parsing), so for a
// faithful KV-file appearance and valid copy output we turn them back into escapes.
// Standalone backslashes (e.g. `\'`) are already literal in the data and left as-is.
function escapeKvValue(value: string): string {
  return value.replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}

// KV-file representation of a single token: `"key"\t\t"value"`.
const kvLine = (e: LocalizationEntry) => `"${e.key}"\t\t"${escapeKvValue(e.value)}"`;
const kvBlock = (block: Block) => block.entries.map(kvLine).join("\n");

// ─── Flat rows for virtualization ─────────────────────────────────────────────--

type Row =
  | { kind: "header"; block: Block; collapsed: boolean }
  | { kind: "line"; entry: LocalizationEntry; first: boolean; last: boolean };

// ─── Spinner ──────────────────────────────────────────────────────────────────--

const spinnerKeyframes = `@keyframes loc-spin { to { transform: rotate(360deg); } }`;

function Spinner() {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        border: "3px solid var(--color-group-border, #333)",
        borderTopColor: "var(--color-highlight, #4af)",
        borderRadius: "50%",
        animation: "loc-spin 1s linear infinite",
        marginRight: 12,
      }}
    />
  );
}

// ─── Row rendering ──────────────────────────────────────────────────────────────

function CopyButton({ label, title, onCopy }: { label: string; title: string; onCopy: () => void }) {
  return (
    <button
      className="loc-copy-btn"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onCopy();
      }}
      style={{
        border: "1px solid var(--color-group-border)",
        background: "var(--color-sidebar)",
        color: "var(--color-text-faded)",
        borderRadius: 3,
        fontSize: 11,
        padding: "1px 6px",
        cursor: "pointer",
        lineHeight: 1.6,
      }}
    >
      {label}
    </button>
  );
}

function makeRenderRow(
  query: string,
  scope: SearchScope,
  searching: boolean,
  copy: (text: string, message: string) => void,
  toggleBlock: (id: string) => void,
) {
  return function renderRow(row: Row, style?: React.CSSProperties) {
    if (row.kind === "header") {
      const { block, collapsed } = row;
      return (
        <div style={{ padding: "6px 6px 0", ...style }} key={`h:${block.id}`}>
          <div
            className="loc-block-header"
            onClick={() => !searching && toggleBlock(block.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 10px",
              background: "var(--color-group)",
              border: "1px solid var(--color-group-border)",
              borderRadius: collapsed ? 4 : "4px 4px 0 0",
              cursor: searching ? "default" : "pointer",
              userSelect: "none",
            }}
          >
            {!searching && (
              <span
                style={{
                  fontSize: 9,
                  color: "var(--color-text-faded)",
                  transition: "transform 0.15s",
                  display: "inline-block",
                  transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
                  width: 10,
                }}
              >
                {"▶"}
              </span>
            )}
            <code style={{ fontWeight: 700, fontSize: 12, color: "var(--color-highlight)", wordBreak: "break-all", flex: 1 }}>
              {searching ? highlight(block.id, query) : block.id}
            </code>
            <span style={{ fontSize: 11, color: "var(--color-text-faded)" }}>({block.entries.length})</span>
            <CopyButton label="Copy block" title="Copy the whole block as KV" onCopy={() => copy(kvBlock(block), "Block copied")} />
          </div>
        </div>
      );
    }

    const { entry, last } = row;
    return (
      <div style={{ padding: "0 6px", ...style }} key={`l:${entry.key}`}>
        <div
          className="loc-kv-line"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            padding: "3px 10px",
            background: "var(--color-group)",
            borderLeft: "1px solid var(--color-group-border)",
            borderRight: "1px solid var(--color-group-border)",
            borderBottom: last ? "1px solid var(--color-group-border)" : "none",
            borderRadius: last ? "0 0 4px 4px" : 0,
            marginBottom: last ? 4 : 0,
          }}
        >
          <code style={{ fontSize: 12.5, fontFamily: "monospace", flex: 1, minWidth: 0, wordBreak: "break-word" }}>
            <span style={{ color: "var(--color-text-faded)" }}>"</span>
            <span style={{ color: "var(--color-syntax-key, var(--color-highlight))" }}>
              {scope === "value" ? entry.key : highlight(entry.key, query)}
            </span>
            <span style={{ color: "var(--color-text-faded)" }}>"</span>
            {"  "}
            <span style={{ color: "var(--color-text-faded)" }}>"</span>
            <span style={{ color: "var(--color-text)", whiteSpace: "pre-wrap" }}>
              {scope === "key" ? escapeKvValue(entry.value) : highlight(escapeKvValue(entry.value), query)}
            </span>
            <span style={{ color: "var(--color-text-faded)" }}>"</span>
          </code>
          <span className="loc-kv-actions" style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <CopyButton label="key" title="Copy key" onCopy={() => copy(entry.key, "Key copied")} />
            <CopyButton label="value" title="Copy value" onCopy={() => copy(entry.value, "Value copied")} />
            <CopyButton label="kv" title="Copy as KV line" onCopy={() => copy(kvLine(entry), "KV line copied")} />
          </span>
        </div>
      </div>
    );
  };
}

// ─── Main component ─────────────────────────────────────────────────────────────

function getLanguageFromUrl(): DotaLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const lang = new URLSearchParams(window.location.search).get("lang");
  return lang && (dotaLanguages as readonly string[]).includes(lang) ? (lang as DotaLanguage) : DEFAULT_LANGUAGE;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

export function LocalizationPage() {
  const [language, setLanguage] = useState<DotaLanguage>(DEFAULT_LANGUAGE);
  const [entries, setEntries] = useState<LocalizationEntry[]>([]);
  const [loadingState, setLoadingState] = useState<"loading" | "idle" | "error">("loading");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<SearchScope>("both");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  const requestRef = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLanguage(getLanguageFromUrl());
  }, []);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoadingState("loading");
    loadLanguage(language)
      .then((loaded) => {
        if (requestRef.current !== requestId) return;
        setEntries(loaded);
        setCollapsed(EMPTY_SET);
        setLoadingState("idle");
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setEntries([]);
        setLoadingState("error");
      });
  }, [language]);

  // Debounce the search so typing doesn't filter ~100k entries on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(rawSearch.trim()), 180);
    return () => clearTimeout(id);
  }, [rawSearch]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const copy = useCallback((text: string, message: string) => {
    copyText(text).then(() => {
      setCopiedMsg(message);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedMsg(null), 1300);
    });
  }, []);

  const selectLanguage = useCallback((lang: DotaLanguage) => {
    setLanguage(lang);
    const base = document.querySelector("base")?.getAttribute("href") || "/";
    const params = new URLSearchParams(window.location.search);
    params.set("lang", lang);
    window.history.replaceState({}, "", `${base}api/localization?${params.toString()}`);
  }, []);

  const toggleBlock = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const searching = search.length > 0;

  const blocks = useMemo(() => {
    const shown = searching ? filterEntries(entries, search, scope) : entries;
    return buildBlocks(shown);
  }, [entries, search, scope, searching]);

  const matchedCount = useMemo(
    () => blocks.reduce((sum, b) => sum + b.entries.length, 0),
    [blocks],
  );

  const allCollapsed = collapsed.size > 0 && collapsed.size >= blocks.length;

  const rows = useMemo(() => {
    const effectiveCollapsed = searching ? EMPTY_SET : collapsed;
    const result: Row[] = [];
    for (const block of blocks) {
      const isCollapsed = effectiveCollapsed.has(block.id);
      result.push({ kind: "header", block, collapsed: isCollapsed });
      if (!isCollapsed) {
        block.entries.forEach((entry, i) =>
          result.push({ kind: "line", entry, first: i === 0, last: i === block.entries.length - 1 }),
        );
      }
    }
    return result;
  }, [blocks, collapsed, searching]);

  const renderRow = useMemo(
    () => makeRenderRow(search, scope, searching, copy, toggleBlock),
    [search, scope, searching, copy, toggleBlock],
  );

  const toggleAll = useCallback(() => {
    setCollapsed((prev) => (prev.size > 0 ? EMPTY_SET : new Set(blocks.map((b) => b.id))));
  }, [blocks]);

  const searchRef = useCtrlFHook<HTMLInputElement>();
  const base = typeof window !== "undefined" ? document.querySelector("base")?.getAttribute("href") || "" : "";

  return (
    <>
      <style>{`
        ${spinnerKeyframes}
        .loc-sidebar-item:hover { background: var(--color-sidebar-hover) !important; }
        .loc-block-header:hover { filter: brightness(1.06); }
        .loc-kv-line:hover { background: var(--color-group-highlight, rgba(128,128,128,0.10)) !important; }
        .loc-kv-actions { opacity: 0; transition: opacity 0.12s; }
        .loc-kv-line:hover .loc-kv-actions { opacity: 1; }
        .loc-copy-btn:hover { color: var(--color-highlight) !important; border-color: var(--color-highlight) !important; }
        @media (max-width: 1100px) { .api-sidebar { width: 220px !important; } }
        @media (max-width: 768px) {
          .api-sidebar { width: 100% !important; max-height: 32vh; border-bottom: 1px solid var(--color-group-border); }
          .api-page-content { flex-direction: column; }
          .loc-kv-actions { opacity: 1; }
        }
      `}</style>
      <NavBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
        <div style={{ width: 260, height: "100%", overflowY: "auto", padding: "2px 12px" }} className="api-sidebar">
          {orderedLanguages.map((lang, index) => {
            const data = dotaLanguagesData[lang];
            const selected = lang === language;
            return (
              <React.Fragment key={lang}>
                {index === PRIORITY_LANGUAGES.length && (
                  <div style={{ borderTop: "1px solid var(--color-group-border)", margin: "6px 4px" }} />
                )}
                <a
                  href={`${base}api/localization?lang=${lang}`}
                  onClick={(e) => {
                    e.preventDefault();
                    selectLanguage(lang);
                  }}
                  className="loc-sidebar-item"
                  style={{
                    background: selected ? "var(--color-sidebar-hover)" : "var(--color-sidebar)",
                    borderBottom: selected ? "3px solid var(--color-highlight)" : "3px solid transparent",
                    borderRadius: 3,
                    padding: "4px 8px 2px 8px",
                    textDecoration: "none",
                    color: "var(--color-text)",
                    fontWeight: selected ? 600 : "normal",
                    display: "flex",
                    flexDirection: "column",
                    fontSize: 13,
                    marginBottom: 3,
                  }}
                >
                  <span>{data.native}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-faded)" }}>{data.english}</span>
                </a>
              </React.Fragment>
            );
          })}
        </div>
        <main style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", padding: "0 0 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: 6, flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                flex: 1,
                minWidth: 200,
                alignItems: "center",
                backgroundColor: "var(--color-searchbox-bg)",
                border: "var(--color-searchbox-border)",
                borderRadius: 32,
                padding: "0 6px",
              }}
            >
              <svg width={16} height={16} viewBox="0 0 16 16" style={{ margin: "0 4px", flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5" fill="none" stroke="var(--color-searchbox-button-fill)" strokeWidth="2" />
                <line x1="11" y1="11" x2="14" y2="14" stroke="var(--color-searchbox-button-fill)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                placeholder="Search localization tokens..."
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                aria-label="Search localization"
                style={{ flex: 1, padding: 8, background: "none", border: "none", outline: "none", color: "var(--color-text)", fontSize: 14 }}
              />
              {rawSearch && (
                <button
                  onClick={() => setRawSearch("")}
                  aria-label="Clear search"
                  title="Clear search"
                  style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-faded)", fontSize: 16, padding: "0 6px" }}
                >
                  {"✕"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 2, borderRadius: 6, overflow: "hidden", border: "1px solid var(--color-group-border)" }}>
              {scopeOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setScope(opt.key)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: scope === opt.key ? 600 : "normal",
                    background: scope === opt.key ? "var(--color-highlight)" : "var(--color-sidebar)",
                    color: scope === opt.key ? "#000" : "var(--color-text)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={toggleAll}
              disabled={searching}
              title={searching ? "Disabled while searching" : "Collapse or expand all blocks"}
              style={{
                border: "1px solid var(--color-group-border)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 13,
                cursor: searching ? "default" : "pointer",
                background: "var(--color-sidebar)",
                color: "var(--color-text)",
                opacity: searching ? 0.5 : 1,
              }}
            >
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          </div>

          {loadingState === "idle" && (
            <div style={{ fontSize: 12, color: "var(--color-text-faded)", margin: "0 12px 4px" }}>
              {searching
                ? `${matchedCount.toLocaleString()} of ${entries.length.toLocaleString()} tokens in ${blocks.length.toLocaleString()} blocks`
                : `${entries.length.toLocaleString()} tokens in ${blocks.length.toLocaleString()} blocks`}
            </div>
          )}

          {loadingState === "loading" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--color-text-faded)" }}>
              <Spinner /> Loading {dotaLanguagesData[language].english} localization...
            </div>
          ) : loadingState === "error" ? (
            <div style={{ padding: 20, textAlign: "center", color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: 4, margin: 6 }}>
              Failed to load {dotaLanguagesData[language].english} localization.
            </div>
          ) : rows.length > 0 ? (
            <LazyList data={rows} render={renderRow} />
          ) : (
            <div style={{ marginTop: 50, alignSelf: "center", fontSize: 24, textAlign: "center", color: "var(--color-text-faded)" }}>
              No results found
            </div>
          )}
        </main>
      </div>

      {copiedMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-group)",
            border: "1px solid var(--color-highlight)",
            color: "var(--color-text)",
            padding: "8px 16px",
            borderRadius: 6,
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            fontSize: 13,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          {"✓ "}
          {copiedMsg}
        </div>
      )}
    </>
  );
}
