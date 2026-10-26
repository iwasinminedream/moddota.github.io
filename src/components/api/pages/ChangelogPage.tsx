import React, { useState, useEffect, useCallback, useMemo } from "react";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { NavBar } from "../layout/NavBar";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ChangeItem {
  type?: string;
  name?: string;
  class?: string;
  enum?: string;
  signature?: string;
  description?: string;
  value?: number | string;
  category?: string;
  fieldsDetail?: string;
  returns?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ChangedItem {
  type?: string;
  name?: string;
  class?: string;
  enum?: string;
  category?: string;
  changes: Record<string, any>;
}

interface CategoryChanges {
  added: ChangeItem[];
  removed: ChangeItem[];
  changed?: ChangedItem[];
}

interface ChangelogEntry {
  version: string;
  date: string;
  time: string;
  commitSha?: string;
  commitDate?: string;
  changes: Record<string, CategoryChanges>;
  // Changes to dota-data made after this version's dump: corrected typings and
  // descriptions, not changes in the game.
  documentation?: Record<string, CategoryChanges>;
}

interface IndexEntry {
  version: string;
  date: string;
  time?: string;
  addedCount?: number;
  removedCount?: number;
  changedCount?: number;
  documentationCount?: number;
}

// ─── Data loading ───────────────────────────────────────────────────────────────

const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
const CHANGELOG_BASE = isDev
  ? "/changelog-data"
  : "https://raw.githubusercontent.com/iwasinminedream/dota-data/master/files";

const changelogCache = new Map<string, ChangelogEntry>();
let indexCache: IndexEntry[] | null = null;

async function loadChangelogIndex(): Promise<IndexEntry[]> {
  if (indexCache) return indexCache;
  try {
    const response = await fetch(`${CHANGELOG_BASE}/changelog-index.json`);
    if (!response.ok) return [];
    const data = await response.json();
    indexCache = data;
    return data;
  } catch {
    return [];
  }
}

async function loadChangelogVersion(version: string): Promise<ChangelogEntry | null> {
  if (changelogCache.has(version)) return changelogCache.get(version)!;
  try {
    const response = await fetch(`${CHANGELOG_BASE}/changelogs/${version}.json`);
    if (!response.ok) return null;
    const data = await response.json();
    changelogCache.set(version, data);
    return data;
  } catch {
    return null;
  }
}

// Update reports written by dota-data's automation: a model's analysis of the API and
// game-code changes, `reports/<version>.md` in Russian and its translation
// `reports/<version>.en.md`. Only recent versions have one.
const REPORT_BASE = isDev
  ? "/report-data"
  : "https://raw.githubusercontent.com/iwasinminedream/dota-data/master/reports";
const REPORT_REPO_URL = "https://github.com/iwasinminedream/dota-data/blob/master/reports/";

type ReportLanguage = "en" | "ru";

const REPORT_LANGUAGES: { id: ReportLanguage; label: string; title: string }[] = [
  { id: "en", label: "EN", title: "English (translated from the Russian original)" },
  { id: "ru", label: "RU", title: "Русский (оригинал)" },
];

function reportFile(version: string, language: ReportLanguage): string {
  return `${version}${language === "en" ? ".en" : ""}.md`;
}

const reportCache = new Map<string, string | null>();

async function loadReport(version: string, language: ReportLanguage): Promise<string | null> {
  const file = reportFile(version, language);
  if (reportCache.has(file)) return reportCache.get(file)!;
  try {
    const response = await fetch(`${REPORT_BASE}/${file}`);
    const text = response.ok ? await response.text() : null;
    reportCache.set(file, text);
    return text;
  } catch {
    return null;
  }
}

// The reader's choice, else the browser's language.
const REPORT_LANGUAGE_KEY = "reportLanguage";

function getReportLanguage(): ReportLanguage {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(REPORT_LANGUAGE_KEY);
  if (saved === "en" || saved === "ru") return saved;
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

// ─── Section type definitions ───────────────────────────────────────────────────

type SectionType = "changed" | "added" | "removed";

const sectionConfig: Record<SectionType, { label: string; color: string; icon: string }> = {
  changed: { label: "Changes", color: "#f59e0b", icon: "~" },
  added: { label: "Additions", color: "#10b981", icon: "+" },
  removed: { label: "Removals", color: "#ef4444", icon: "-" },
};

const categoryOrder = [
  "Abilities",
  "Units",
  "Ability KV Properties",
  "Unit KV Properties",
  "Lua API",
  "Panorama API",
  "Lua Enums",
  "Panorama Enums",
  "Engine Enums",
  "Game Events",
  "Panorama Events",
  "Panorama CSS",
  "Console Variables",
  "Modifiers",
  "Native Modifier Functions",
  "Native Modifier Functions (client.dll)",
  "Properties Fixed",
  "Lua Types",
  "Localization",
];

function getCategorySort(name: string): number {
  const idx = categoryOrder.indexOf(name);
  return idx === -1 ? categoryOrder.length : idx;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const diffFieldLabels: Record<string, string> = {
  returns: "Returns",
  value: "Value",
  description: "Description",
  signature: "Signature",
  argDescriptions: "Arguments",
};

const typeKinds = new Set(["object", "nominal", "primitive"]);

// A function or CheckState state of a native modifier (`modifier_function`, `modifier_state`;
// `modifier_function_client` is client.dll's result where it differs from server.dll's):
// `modifier_x.MODIFIER_PROPERTY_Y` -> ["modifier_x", "MODIFIER_PROPERTY_Y"].
const nativeModifierTypes = new Set(["modifier_function", "modifier_function_client", "modifier_state"]);

// client.dll's results come in the same category as server.dll's; they are shown on their own.
const CLIENT_FUNCTIONS_SUFFIX = " (client.dll)";

const categoryTitles: Record<string, string> = {
  [`Native Modifier Functions${CLIENT_FUNCTIONS_SUFFIX}`]:
    "client.dll's own copy of the modifier, where its result differs from server.dll's or only the client has the function: what the client predicts and shows in tooltips",
};

function isClientFunction(item: { type?: string }): boolean {
  return item.type === "modifier_function_client";
}

function partition<T>(items: T[] = [], test: (item: T) => boolean): [T[], T[]] {
  return [items.filter((item) => !test(item)), items.filter(test)];
}

function splitClientFunctions(changes: Record<string, CategoryChanges>): Record<string, CategoryChanges> {
  const out: Record<string, CategoryChanges> = {};
  for (const [catName, cat] of Object.entries(changes)) {
    const [added, clientAdded] = partition(cat.added, isClientFunction);
    const [removed, clientRemoved] = partition(cat.removed, isClientFunction);
    const [changed, clientChanged] = partition(cat.changed, isClientFunction);
    out[catName] = { added, removed, changed };
    if (clientAdded.length + clientRemoved.length + clientChanged.length > 0) {
      out[`${catName}${CLIENT_FUNCTIONS_SUFFIX}`] = { added: clientAdded, removed: clientRemoved, changed: clientChanged };
    }
  }
  return out;
}

function splitModifierFunction(name = ""): [string, string] {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? ["Native Modifiers", name] : [name.slice(0, dot), name.slice(dot + 1)];
}

function getGroupKey(item: { type?: string; name?: string; class?: string; enum?: string; category?: string }): string {
  if (item.type === "method" || item.type === "function") return item.class || "Global Functions";
  if (item.type === "type_field") return item.class || "Types";
  if (item.type && typeKinds.has(item.type)) return "__types__";
  if (item.type === "enum_member") return item.enum || "Enums";
  if (item.type === "constant" || item.type === "const") return item.class || "Constants";
  if (item.type === "class") return "__classes__";
  if (item.type === "enum") return "__enums__";
  if (item.type === "event") return "__events__";
  if (item.type === "convar") return "__convars__";
  if (item.type === "ability") return "__abilities__";
  if (item.type === "unit") return "__units__";
  if (item.type === "kv_property") return "__kv_properties__";
  if (item.type === "modifier") return item.category || "Modifiers";
  if (item.type === "modifier_property") return "__modifier_properties__";
  if (item.type && nativeModifierTypes.has(item.type)) return splitModifierFunction(item.name)[0];
  if (item.type === "localization") return "__localization__";
  if (item.type === "property") return item.class || "Properties";
  return item.type || "Other";
}

function getChangedGroupKey(item: { type?: string; name?: string; class?: string; enum?: string }): string {
  if (item.type === "method" || item.type === "function") return item.class || "Global Functions";
  if (item.type === "type_field") return item.class || "Types";
  if (item.type && typeKinds.has(item.type)) return "__types__";
  if (item.type === "enum_member") return item.enum || "Enums";
  if (item.type === "ability") return "__abilities__";
  if (item.type === "unit") return "__units__";
  if (item.type === "modifier_property") return "__modifier_properties__";
  if (item.type && nativeModifierTypes.has(item.type)) return splitModifierFunction(item.name)[0];
  if (item.type === "localization") return "__localization__";
  return item.type || "Other";
}

function sortGroups<T>(entries: [string, T[]][]): [string, T[]][] {
  return entries.sort((a, b) => {
    const aSpecial = a[0].startsWith("__");
    const bSpecial = b[0].startsWith("__");
    if (aSpecial !== bSpecial) return aSpecial ? -1 : 1;
    return a[0].localeCompare(b[0]);
  });
}

function getGroupLabel(key: string): string {
  const labels: Record<string, string> = {
    __classes__: "Classes",
    __enums__: "Enums",
    __events__: "Events",
    __convars__: "Console Variables",
    __abilities__: "Abilities",
    __units__: "Units",
    __kv_properties__: "KV Properties",
    __modifier_properties__: "Modifier Properties",
    __localization__: "Strings",
    __types__: "Types",
  };
  return labels[key] || key;
}

function groupItemsBy<T>(items: T[], keyFn: (item: T) => string): [string, T[]][] {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return sortGroups(Object.entries(groups));
}

function aggregateBySection(changes: Record<string, CategoryChanges>) {
  const sections: Record<SectionType, { category: string; items: (ChangeItem | ChangedItem)[] }[]> = {
    changed: [],
    added: [],
    removed: [],
  };

  const catEntries = Object.entries(splitClientFunctions(changes)).sort(
    (a, b) => getCategorySort(a[0]) - getCategorySort(b[0]),
  );

  for (const [catName, cat] of catEntries) {
    if (cat.changed && cat.changed.length > 0) {
      sections.changed.push({ category: catName, items: cat.changed });
    }
    if (cat.added && cat.added.length > 0) {
      sections.added.push({ category: catName, items: cat.added });
    }
    if (cat.removed && cat.removed.length > 0) {
      sections.removed.push({ category: catName, items: cat.removed });
    }
  }

  return sections;
}

// ─── Render helpers ─────────────────────────────────────────────────────────────

function renderAddedRemovedItem(item: ChangeItem): React.ReactNode {
  if (item.type === "class") return <span style={{ color: "#2563eb", fontWeight: 600 }}>{item.name}</span>;
  if (item.type === "enum") return <span style={{ color: "#7c3aed", fontWeight: 600 }}>{item.name}</span>;
  if (item.type === "method" || item.type === "function") {
    return (
      <>
        <span style={{ color: "var(--color-highlight)", fontWeight: 500 }}>{item.signature || item.name}</span>
        {item.returns && <span style={{ color: "var(--color-text-dim, #888)", fontSize: 12 }}> &rarr; {item.returns}</span>}
      </>
    );
  }
  if (item.type === "enum_member") {
    return (
      <>
        <span style={{ fontWeight: 500 }}>{item.name}</span>
        {item.value !== undefined && <span style={{ color: "var(--color-text-dim, #888)", fontSize: 12 }}> = {item.value}</span>}
      </>
    );
  }
  if (item.type === "event") {
    return (
      <>
        <span style={{ fontWeight: 500 }}>{item.name}</span>
        {item.fieldsDetail && <span style={{ color: "var(--color-text-dim, #888)", fontSize: 12 }}> ({item.fieldsDetail})</span>}
      </>
    );
  }
  if (item.type === "constant" || item.type === "const") {
    return (
      <>
        <span style={{ fontWeight: 500 }}>{item.name}</span>
        {item.value !== undefined && <span style={{ color: "var(--color-text-dim, #888)", fontSize: 12 }}> = {item.value}</span>}
      </>
    );
  }
  if (item.type === "type_field") {
    return (
      <>
        <span style={{ color: "var(--color-highlight)", fontWeight: 500 }}>{item.signature || item.name}</span>
        {item.description && (
          <span style={{ color: "var(--color-text-dim, #888)", fontSize: 12, whiteSpace: "pre-wrap" }}> &mdash; {item.description}</span>
        )}
      </>
    );
  }
  if (item.type === "ability") return <span style={{ fontWeight: 600, color: "#d97706" }}>{item.name}</span>;
  if (item.type === "unit") return <span style={{ fontWeight: 600, color: "#0891b2" }}>{item.name}</span>;
  if (item.type === "kv_property") return <span style={{ fontWeight: 600, color: "#7c3aed" }}>{item.name}</span>;
  if (item.type && nativeModifierTypes.has(item.type)) {
    // A function's value is its formula, or the status when there is none ("event", "unresolved");
    // a state's is `true`, `false` or `true when <condition>`.
    const formula =
      item.type === "modifier_state" ? item.value : item.value === "event" ? undefined : item.value === "unresolved" ? "(unresolved)" : item.value;
    return (
      <>
        <span style={{ color: "var(--color-highlight)", fontWeight: 500 }}>{splitModifierFunction(item.name)[1]}</span>
        {formula !== undefined && (
          <span style={{ color: "var(--color-text-dim, #888)", fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}> = {formula}</span>
        )}
      </>
    );
  }
  if (item.type === "localization") {
    return (
      <>
        <span style={{ color: "var(--color-highlight)", fontWeight: 500 }}>{item.name}</span>
        {item.value !== undefined && (
          <span style={{ color: "var(--color-text-dim, #888)", fontSize: 12 }}> = "{item.value}"</span>
        )}
      </>
    );
  }
  return <span style={{ fontWeight: 500 }}>{item.name || JSON.stringify(item)}</span>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLeafDiff(v: any): v is { old: unknown; new: unknown } {
  return typeof v === "object" && v !== null && "old" in v && "new" in v;
}

function formatKvValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const kvStyles = {
  block: { margin: "2px 0 2px 16px", fontFamily: "monospace", fontSize: 12 } as React.CSSProperties,
  blockHeader: { fontWeight: 600, color: "#8b5cf6", fontSize: 12, marginBottom: 1 } as React.CSSProperties,
  fieldRow: { margin: "1px 0", padding: "1px 6px", fontFamily: "monospace", fontSize: 12 } as React.CSSProperties,
  fieldName: { color: "#60a5fa", fontWeight: 500 } as React.CSSProperties,
  subFieldName: { color: "var(--color-text-faded, #999)" } as React.CSSProperties,
  oldValue: { color: "#ef4444", textDecoration: "line-through", marginRight: 4 } as React.CSSProperties,
  newValue: { color: "#10b981", fontWeight: 500 } as React.CSSProperties,
  unchanged: { color: "var(--color-text-dim, #888)" } as React.CSSProperties,
  arrow: { color: "var(--color-text-faded, #999)", margin: "0 4px" } as React.CSSProperties,
  diffOld: {
    fontFamily: "monospace", fontSize: 12, margin: "1px 0", padding: "2px 8px",
    borderRadius: 3, backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--color-text)",
    borderLeft: "3px solid #ef4444", whiteSpace: "pre-wrap",
  } as React.CSSProperties,
  diffNew: {
    fontFamily: "monospace", fontSize: 12, margin: "1px 0", padding: "2px 8px",
    borderRadius: 3, backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--color-text)",
    borderLeft: "3px solid #10b981", whiteSpace: "pre-wrap",
  } as React.CSSProperties,
};

function renderKvLeaf(key: string, old: unknown, newVal: unknown): React.ReactNode {
  const oldStr = formatKvValue(old);
  const newStr = formatKvValue(newVal);
  const changed = oldStr !== newStr;
  return (
    <div key={key} style={kvStyles.fieldRow}>
      <span style={kvStyles.subFieldName}>"{key}": </span>
      {changed ? (
        <>
          <span style={kvStyles.oldValue}>{oldStr || '""'}</span>
          <span style={kvStyles.arrow}>&rarr;</span>
          <span style={kvStyles.newValue}>{newStr || '""'}</span>
        </>
      ) : (
        <span style={kvStyles.unchanged}>{oldStr}</span>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderKvChangesInline(changes: Record<string, any>): React.ReactNode {
  return Object.entries(changes).map(([key, value]) => {
    if (isLeafDiff(value)) {
      const oldStr = formatKvValue(value.old);
      const newStr = formatKvValue(value.new);
      return (
        <div key={key} style={kvStyles.fieldRow}>
          <span style={kvStyles.fieldName}>"{key}": </span>
          <span style={kvStyles.oldValue}>{oldStr || '""'}</span>
          <span style={kvStyles.arrow}>&rarr;</span>
          <span style={kvStyles.newValue}>{newStr || '""'}</span>
        </div>
      );
    }
    const entries = Object.entries(value);
    const allLeaves = entries.every(([, v]) => isLeafDiff(v));
    if (allLeaves) {
      return (
        <div key={key} style={kvStyles.block}>
          <div style={kvStyles.blockHeader}>{key}</div>
          {entries.map(([subKey, subVal]: [string, any]) =>
            renderKvLeaf(subKey, subVal.old, subVal.new),
          )}
        </div>
      );
    }
    return (
      <div key={key} style={kvStyles.block}>
        <div style={kvStyles.blockHeader}>{key}</div>
        {renderKvChangesInline(value)}
      </div>
    );
  });
}

function renderChangedItem(item: ChangedItem): React.ReactNode {
  const isAbilityOrUnit = item.type === "ability" || item.type === "unit";
  const nameColor = item.type === "ability" ? "#d97706" : item.type === "unit" ? "#0891b2" : "var(--color-highlight)";

  // Modifier-property availability flips render inline, e.g.
  //   MODIFIER_PROPERTY_MOVESPEED_MAX_BONUS_CONSTANT: true -> false
  // Colour follows the value, not the position: true is always green, false red.
  if (item.type === "modifier_property") {
    const v = (item.changes?.value ?? {}) as { old?: unknown; new?: unknown };
    const valueColor = (val: unknown) => (String(val) === "true" ? "#10b981" : "#ef4444");
    return (
      <div
        className="changelog-changed-item"
        style={{ fontFamily: "monospace", fontSize: 13, padding: "2px 6px" }}
      >
        <span style={{ color: "var(--color-highlight)", fontWeight: 500 }}>{item.name}</span>
        <span style={{ color: "var(--color-text-faded, #999)" }}>: </span>
        <span style={{ color: valueColor(v.old), fontWeight: 600 }}>{String(v.old)}</span>
        <span style={kvStyles.arrow}>-&gt;</span>
        <span style={{ color: valueColor(v.new), fontWeight: 600 }}>{String(v.new)}</span>
      </div>
    );
  }

  // A changed formula or state of a native modifier (the group is the modifier).
  if (item.type && nativeModifierTypes.has(item.type)) {
    const v = (item.changes?.value ?? {}) as { old?: unknown; new?: unknown };
    return (
      <div className="changelog-changed-item">
        <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          <span style={{ color: "var(--color-highlight)", fontWeight: 500 }}>{splitModifierFunction(item.name)[1]}</span>
        </div>
        <div style={{ margin: "2px 0 4px 12px", overflowWrap: "anywhere" }}>
          <div style={kvStyles.diffOld}>
            <span style={{ color: "#ef4444", fontWeight: "bold" }}>- </span>{formatKvValue(v.old) || "(empty)"}
          </div>
          <div style={kvStyles.diffNew}>
            <span style={{ color: "#10b981", fontWeight: "bold" }}>+ </span>{formatKvValue(v.new) || "(empty)"}
          </div>
        </div>
      </div>
    );
  }

  if (isAbilityOrUnit) {
    return (
      <div className="changelog-changed-item">
        <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          <span style={{ color: nameColor, fontWeight: 600 }}>{item.name}</span>
        </div>
        {renderKvChangesInline(item.changes)}
      </div>
    );
  }

  return (
    <div className="changelog-changed-item">
      <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        <span style={{ color: nameColor, fontWeight: 500 }}>{item.name}</span>
      </div>
      {Object.entries(item.changes).map(([field, diff]) => (
        <div key={field} style={{ margin: "2px 0 4px 12px" }}>
          {diffFieldLabels[field] && (
            <span style={{ fontWeight: 600, color: "var(--color-text-faded, #999)", marginRight: 6, fontSize: 11, textTransform: "uppercase" }}>
              {diffFieldLabels[field]}:
            </span>
          )}
          <div style={kvStyles.diffOld}>
            <span style={{ color: "#ef4444", fontWeight: "bold" }}>- </span>{diff.old || "(empty)"}
          </div>
          <div style={kvStyles.diffNew}>
            <span style={{ color: "#10b981", fontWeight: "bold" }}>+ </span>{diff.new || "(empty)"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Collapsible class/enum group ───────────────────────────────────────────────

function ClassEnumGroup({
  groupKey,
  items,
  sectionType,
  collapsedKeys,
  toggleKey,
  collapsePrefix,
}: {
  groupKey: string;
  items: (ChangeItem | ChangedItem)[];
  sectionType: SectionType;
  collapsedKeys: Set<string>;
  toggleKey: (key: string) => void;
  collapsePrefix: string;
}) {
  const fullKey = `${collapsePrefix}-${groupKey}`;
  const isCollapsed = collapsedKeys.has(fullKey);
  const isSpecial = groupKey.startsWith("__");
  const label = isSpecial ? getGroupLabel(groupKey) : groupKey;
  const isEnum = items.some((it) => it.type === "enum_member" || (it as ChangeItem).enum);

  const labelStyle: React.CSSProperties = isSpecial
    ? { fontWeight: 500 }
    : isEnum
      ? { fontWeight: 600, color: "#7c3aed" }
      : { fontWeight: 600, color: "#2563eb" };

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        className="changelog-class-group-header"
        onClick={() => toggleKey(fullKey)}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "3px 6px",
          cursor: "pointer", userSelect: "none", borderRadius: 3, fontSize: 13,
        }}
      >
        <span style={{
          fontSize: 8, color: "var(--color-text-faded, #999)",
          transition: "transform 0.15s", display: "inline-block",
          transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)", width: 10,
        }}>&#9654;</span>
        <span style={labelStyle}>{label}</span>
        <span style={{ fontSize: 11, color: "var(--color-text-faded, #999)" }}>({items.length})</span>
      </div>
      {!isCollapsed && (
        <div style={{ marginLeft: 22, padding: "2px 0", display: "flex", flexDirection: "column", gap: 1 }}>
          {sectionType === "changed"
            ? items.map((item, i) => <div key={i}>{renderChangedItem(item as ChangedItem)}</div>)
            : items.map((item, i) => (
                <div key={i} className="changelog-item-row" style={{
                  fontFamily: "monospace", fontSize: 13, color: "var(--color-text)",
                  padding: "2px 6px", borderRadius: 3,
                }}>
                  {renderAddedRemovedItem(item as ChangeItem)}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}

// ─── Category sub-block ─────────────────────────────────────────────────────────

function CategorySubBlock({
  categoryName,
  items,
  sectionType,
  collapsedKeys,
  toggleKey,
  keyPrefix = "",
}: {
  categoryName: string;
  items: (ChangeItem | ChangedItem)[];
  sectionType: SectionType;
  collapsedKeys: Set<string>;
  toggleKey: (key: string) => void;
  keyPrefix?: string;
}) {
  const catKey = `${keyPrefix}${sectionType}-cat-${categoryName}`;
  const isCatCollapsed = collapsedKeys.has(catKey);

  const groupedEntries = useMemo(() => {
    if (sectionType === "changed") {
      return groupItemsBy(items as ChangedItem[], getChangedGroupKey);
    }
    return groupItemsBy(items as ChangeItem[], getGroupKey);
  }, [items, sectionType]);

  return (
    <div style={{
      backgroundColor: "var(--color-group)", border: "1px solid var(--color-group-border)",
      borderRadius: 4, overflow: "hidden",
    }}>
      <div
        className="changelog-category-header"
        onClick={() => toggleKey(catKey)}
        style={{
          display: "flex", alignItems: "center", padding: "6px 10px",
          cursor: "pointer", userSelect: "none", gap: 8, fontSize: 14,
          fontWeight: 600, color: "var(--color-text)", backgroundColor: "var(--color-group)",
        }}
      >
        <span style={{
          fontSize: 10, color: "var(--color-text-faded, #999)",
          transition: "transform 0.2s", display: "inline-block",
          transform: isCatCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}>&#9660;</span>
        <span style={{ flex: 1 }} title={categoryTitles[categoryName]}>{categoryName}</span>
        <span style={{ fontSize: 11, fontWeight: "normal", color: "var(--color-text-faded, #999)" }}>
          {items.length} items
        </span>
      </div>
      {!isCatCollapsed && (
        <div style={{
          backgroundColor: "var(--color-group-members, var(--color-group))",
          padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          {groupedEntries.map(([gKey, gItems]) => (
            <ClassEnumGroup
              key={gKey}
              groupKey={gKey}
              items={gItems}
              sectionType={sectionType}
              collapsedKeys={collapsedKeys}
              toggleKey={toggleKey}
              collapsePrefix={`${keyPrefix}${sectionType}-${categoryName}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top-level section block ────────────────────────────────────────────────────

function TopSection({
  sectionType,
  categories,
  collapsedKeys,
  toggleKey,
  keyPrefix = "",
}: {
  sectionType: SectionType;
  categories: { category: string; items: (ChangeItem | ChangedItem)[] }[];
  collapsedKeys: Set<string>;
  toggleKey: (key: string) => void;
  keyPrefix?: string;
}) {
  if (categories.length === 0) return null;

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const topKey = `${keyPrefix}top-${sectionType}`;
  const isCollapsed = collapsedKeys.has(topKey);
  const cfg = sectionConfig[sectionType];

  return (
    <div style={{
      borderRadius: 6, overflow: "hidden", marginBottom: 10,
      border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)`,
      backgroundColor: `color-mix(in srgb, ${cfg.color} 7%, transparent)`,
    }}>
      <div
        className="changelog-top-section-header"
        onClick={() => toggleKey(topKey)}
        style={{
          display: "flex", alignItems: "center", padding: "10px 14px",
          cursor: "pointer", userSelect: "none", gap: 10,
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 6, fontWeight: 800, fontSize: 18,
          color: "white", backgroundColor: cfg.color, flexShrink: 0,
        }}>{cfg.icon}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>{cfg.label}</span>
        <span style={{ fontSize: 13, color: "var(--color-text-faded, #999)", marginLeft: "auto" }}>
          {totalItems} items
        </span>
        <span style={{
          fontSize: 10, color: "var(--color-text-faded, #999)",
          transition: "transform 0.2s", display: "inline-block",
          transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}>&#9660;</span>
      </div>
      {!isCollapsed && (
        <div style={{ padding: "0 10px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          {categories.map(({ category, items }) => (
            <CategorySubBlock
              key={category}
              categoryName={category}
              items={items}
              sectionType={sectionType}
              collapsedKeys={collapsedKeys}
              toggleKey={toggleKey}
              keyPrefix={keyPrefix}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Documentation block ────────────────────────────────────────────────────────

const DOCS_COLOR = "#3b82f6";
const DOCS_KEY_PREFIX = "doc-";

function DocumentationBlock({
  sections,
  collapsedKeys,
  toggleKey,
}: {
  sections: ReturnType<typeof aggregateBySection>;
  collapsedKeys: Set<string>;
  toggleKey: (key: string) => void;
}) {
  const totalItems = (["changed", "added", "removed"] as SectionType[]).reduce(
    (sum, t) => sum + sections[t].reduce((s, c) => s + c.items.length, 0),
    0,
  );
  if (totalItems === 0) return null;

  const blockKey = `${DOCS_KEY_PREFIX}block`;
  const isCollapsed = collapsedKeys.has(blockKey);

  return (
    <div style={{
      borderRadius: 6, overflow: "hidden", marginBottom: 10,
      border: `1px solid color-mix(in srgb, ${DOCS_COLOR} 30%, transparent)`,
      backgroundColor: `color-mix(in srgb, ${DOCS_COLOR} 5%, transparent)`,
    }}>
      <div
        className="changelog-top-section-header"
        onClick={() => toggleKey(blockKey)}
        style={{
          display: "flex", alignItems: "center", padding: "10px 14px",
          cursor: "pointer", userSelect: "none", gap: 10,
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 6, fontWeight: 800, fontSize: 16,
          color: "white", backgroundColor: DOCS_COLOR, flexShrink: 0,
        }}>&#9998;</span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>Documentation</span>
          <span style={{ fontSize: 12, color: "var(--color-text-faded, #999)" }}>
            Typings and descriptions corrected in dota-data after this version's dump. Not changes in the game.
          </span>
        </span>
        <span style={{ fontSize: 13, color: "var(--color-text-faded, #999)", marginLeft: "auto" }}>
          {totalItems} items
        </span>
        <span style={{
          fontSize: 10, color: "var(--color-text-faded, #999)",
          transition: "transform 0.2s", display: "inline-block",
          transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}>&#9660;</span>
      </div>
      {!isCollapsed && (
        <div style={{ padding: "0 10px 0 10px" }}>
          {(["changed", "added", "removed"] as SectionType[]).map((t) => (
            <TopSection
              key={t}
              sectionType={t}
              categories={sections[t]}
              collapsedKeys={collapsedKeys}
              toggleKey={toggleKey}
              keyPrefix={DOCS_KEY_PREFIX}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI report block ────────────────────────────────────────────────────────────

const REPORT_COLOR = "#a855f7";

const REPORT_TAGS = new Set([
  "a", "blockquote", "br", "code", "del", "details", "em", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "li", "ol", "p", "pre", "strong", "summary", "table", "tbody", "td", "th", "thead", "tr", "ul",
]);
const REPORT_DROPPED_TAGS = new Set(["script", "style", "iframe", "object", "embed", "template", "noscript"]);
const REPORT_ATTRIBUTES: Record<string, string[]> = { a: ["href"], td: ["align"], th: ["align"], code: ["class"] };

// Markdown → HTML for a report. The reports use raw <details> blocks, so HTML passes
// through micromark and is then cut down to plain formatting tags. Relative links
// (`../files/changelogs/N.json`, `N-functions.md`) point into the dota-data repo and
// would be dead on this site, so they go to GitHub instead.
function renderReport(markdown: string): string {
  // The "# Dota N: ..." title repeats the version header above the block.
  const body = markdown.replace(/^# [^\r\n]*[\r\n]+/, "");
  const html = micromark(body, { extensions: [gfm()], htmlExtensions: [gfmHtml()], allowDangerousHtml: true });
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");

  const clean = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (REPORT_DROPPED_TAGS.has(tag)) {
        child.remove();
        continue;
      }
      clean(child);
      if (!REPORT_TAGS.has(tag)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      const allowed = REPORT_ATTRIBUTES[tag] ?? [];
      for (const attr of Array.from(child.attributes)) {
        if (!allowed.includes(attr.name)) child.removeAttribute(attr.name);
      }
      if (tag === "a") {
        const href = child.getAttribute("href") ?? "";
        if (href.startsWith("#")) continue;
        let url: URL | null = null;
        try {
          url = new URL(href, REPORT_REPO_URL);
        } catch {
          // Malformed URL: keep the text, drop the link.
        }
        if (url && (url.protocol === "https:" || url.protocol === "http:")) {
          child.setAttribute("href", url.href);
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        } else {
          child.removeAttribute("href");
        }
      }
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}

function ReportBlock({ version }: { version: string }) {
  const [reports, setReports] = useState<Partial<Record<ReportLanguage, string>> | null>(null);
  // The block renders nothing until the reports are loaded, so reading the saved
  // language on the first render cannot differ from the server HTML.
  const [language, setLanguage] = useState<ReportLanguage>(getReportLanguage);
  // Collapsed by default, and again after a version switch (the block remounts
  // while the next version loads).
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReports(null);
    Promise.all(REPORT_LANGUAGES.map(({ id }) => loadReport(version, id))).then((texts) => {
      if (cancelled) return;
      const loaded: Partial<Record<ReportLanguage, string>> = {};
      REPORT_LANGUAGES.forEach(({ id }, i) => {
        if (texts[i]) loaded[id] = texts[i]!;
      });
      setReports(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  // The chosen language, or the other one when this version has no report in it.
  const shown = reports?.[language] ? language : REPORT_LANGUAGES.find(({ id }) => reports?.[id])?.id;
  const report = shown ? reports?.[shown] : undefined;
  const html = useMemo(() => (report && open ? renderReport(report) : ""), [report, open]);

  if (!report || !shown) return null;

  const chooseLanguage = (id: ReportLanguage) => {
    setLanguage(id);
    localStorage.setItem(REPORT_LANGUAGE_KEY, id);
  };

  return (
    // flexShrink 0: this sits directly in the scrolling flex column, where overflow:hidden
    // would otherwise let it shrink to nothing next to a long changelog.
    <div style={{
      borderRadius: 6, overflow: "hidden", margin: "0 6px 10px 6px", flexShrink: 0,
      border: `1px solid color-mix(in srgb, ${REPORT_COLOR} 30%, transparent)`,
      backgroundColor: `color-mix(in srgb, ${REPORT_COLOR} 5%, transparent)`,
    }}>
      <div
        className="changelog-top-section-header"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", padding: "10px 14px",
          cursor: "pointer", userSelect: "none", gap: 10,
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 6, fontWeight: 800, fontSize: 12,
          color: "white", backgroundColor: REPORT_COLOR, flexShrink: 0,
        }}>AI</span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>AI analysis</span>
          <span style={{ fontSize: 12, color: "var(--color-text-faded, #999)" }}>
            What changed in the API and in the game code, written by a neural network from the dump and the
            game binaries. May contain mistakes.{shown === "en" && " Translated from the Russian original."}
          </span>
        </span>
        <span
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex", marginLeft: "auto", flexShrink: 0, borderRadius: 4, overflow: "hidden",
            border: `1px solid color-mix(in srgb, ${REPORT_COLOR} 40%, transparent)`,
          }}
        >
          {REPORT_LANGUAGES.map(({ id, label, title }) => {
            const available = !!reports?.[id];
            const active = id === shown;
            return (
              <button
                key={id}
                disabled={!available}
                title={available ? title : "No report in this language for this version"}
                onClick={() => chooseLanguage(id)}
                style={{
                  border: "none", padding: "3px 9px", fontSize: 12, fontWeight: 700,
                  cursor: available ? "pointer" : "default", opacity: available ? 1 : 0.4,
                  color: active ? "white" : "var(--color-text-faded, #999)",
                  backgroundColor: active ? REPORT_COLOR : "transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </span>
        <a
          href={`${REPORT_REPO_URL}${reportFile(version, shown)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: 13, color: "var(--color-text-faded, #999)", whiteSpace: "nowrap" }}
        >
          GitHub
        </a>
        <span style={{
          fontSize: 10, color: "var(--color-text-faded, #999)",
          transition: "transform 0.2s", display: "inline-block",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        }}>&#9660;</span>
      </div>
      {open && (
        <div
          className="changelog-report"
          style={{
            margin: "0 10px 10px 10px", padding: "4px 14px",
            backgroundColor: "var(--color-group)", border: "1px solid var(--color-group-border)", borderRadius: 4,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}

// ─── Version content ────────────────────────────────────────────────────────────

function VersionContent({ entry }: { entry: ChangelogEntry }) {
  const sections = useMemo(() => aggregateBySection(entry.changes), [entry]);
  const docsSections = useMemo(() => aggregateBySection(entry.documentation ?? {}), [entry]);

  const hasAny =
    sections.changed.length > 0 || sections.added.length > 0 || sections.removed.length > 0;
  const hasDocs =
    docsSections.changed.length > 0 || docsSections.added.length > 0 || docsSections.removed.length > 0;

  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  const toggleKey = useCallback((key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const autoCollapse = new Set<string>();
    for (const sectionType of ["changed", "added", "removed"] as SectionType[]) {
      const cats = sections[sectionType];
      for (const { category, items } of cats) {
        // Localization diffs can be huge, so keep that category collapsed by default; client.dll's
        // results are secondary to server.dll's.
        if (category === "Localization" || category.endsWith(CLIENT_FUNCTIONS_SUFFIX)) {
          autoCollapse.add(`${sectionType}-cat-${category}`);
        }
        for (const item of items) {
          if ((item as ChangeItem).type === "modifier") {
            autoCollapse.add(
              `${sectionType}-${category}-${(item as ChangeItem).category || "Modifiers"}`,
            );
          }
        }
      }
    }
    setCollapsedKeys(autoCollapse);
  }, [entry]);

  const noChanges = (
    <div style={{ color: "var(--color-text-faded, #999)", fontStyle: "italic", padding: hasDocs ? 16 : 40, textAlign: "center" }}>
      No API changes detected in this version
    </div>
  );

  if (!hasAny && !hasDocs) return noChanges;

  return (
    <div style={{ padding: "0 6px" }}>
      {hasAny ? (
        <>
          <TopSection sectionType="changed" categories={sections.changed} collapsedKeys={collapsedKeys} toggleKey={toggleKey} />
          <TopSection sectionType="added" categories={sections.added} collapsedKeys={collapsedKeys} toggleKey={toggleKey} />
          <TopSection sectionType="removed" categories={sections.removed} collapsedKeys={collapsedKeys} toggleKey={toggleKey} />
        </>
      ) : (
        noChanges
      )}
      <DocumentationBlock sections={docsSections} collapsedKeys={collapsedKeys} toggleKey={toggleKey} />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function ChangelogPage() {
  const [index, setIndex] = useState<IndexEntry[]>([]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "error">("idle");
  const [currentEntry, setCurrentEntry] = useState<ChangelogEntry | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  const resolveVersionFromUrl = useCallback((data: IndexEntry[]): string => {
    const path = window.location.pathname;
    const match = path.match(/changelog\/([^/]+)/);
    const raw = match ? match[1] : "";
    if (raw && raw !== "latest") return raw;
    return data[0]?.version ?? "";
  }, []);

  useEffect(() => {
    loadChangelogIndex().then((data) => {
      setIndex(data);
      setIndexLoading(false);
      setSelectedVersion(resolveVersionFromUrl(data));
    });
  }, [resolveVersionFromUrl]);

  // Sync state with URL when the user uses browser back/forward buttons.
  useEffect(() => {
    if (index.length === 0) return;
    const handler = () => setSelectedVersion(resolveVersionFromUrl(index));
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [index, resolveVersionFromUrl]);

  const loadVersion = useCallback(async (version: string) => {
    if (!version) return;
    setLoadingState("loading");
    try {
      const entry = await loadChangelogVersion(version);
      if (entry) {
        setCurrentEntry(entry);
        setLoadingState("idle");
      } else {
        setLoadingState("error");
      }
    } catch {
      setLoadingState("error");
    }
  }, []);

  useEffect(() => {
    if (selectedVersion) loadVersion(selectedVersion);
  }, [selectedVersion, loadVersion]);

  const base = typeof window !== "undefined"
    ? document.querySelector("base")?.getAttribute("href") || ""
    : "";

  const selectVersion = (v: string) => {
    setSelectedVersion(v);
    // Use trailing slash to match Astro's directory-style static output.
    window.history.pushState({}, "", `${base}api/changelog/${v}/`);
  };

  const spinnerKeyframes = `@keyframes changelog-spin { to { transform: rotate(360deg); } }`;

  const renderSpinner = () => (
    <div style={{
      width: 24, height: 24,
      border: "3px solid var(--color-group-border, #333)",
      borderTopColor: "var(--color-highlight, #4af)",
      borderRadius: "50%",
      animation: "changelog-spin 1s linear infinite",
      marginRight: 12,
    }} />
  );

  const renderContent = () => {
    if (loadingState === "loading") {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--color-text-faded, #999)" }}>
          {renderSpinner()}
          Loading changelog for version {selectedVersion}...
        </div>
      );
    }
    if (loadingState === "error") {
      return (
        <div style={{ padding: 20, textAlign: "center", color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: 4, margin: 6 }}>
          Failed to load changelog for version {selectedVersion}.
        </div>
      );
    }
    if (!currentEntry) {
      return (
        <div style={{ color: "var(--color-text-faded, #999)", fontStyle: "italic", padding: 40, textAlign: "center" }}>
          Select a version from the sidebar
        </div>
      );
    }
    return (
      <>
        <div style={{
          backgroundColor: "var(--color-group)", border: "1px solid var(--color-group-border)",
          borderRadius: 4, boxShadow: "2px 2px 6px var(--color-group-shadow, rgba(0,0,0,0.1))",
          margin: 6,
        }}>
          <div style={{ padding: "8px 12px" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 700 }}>
              Version {currentEntry.version}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-faded, #999)", fontSize: 13 }}>
              {currentEntry.date}
              {currentEntry.time && ` at ${currentEntry.time}`}
              {currentEntry.commitSha && (
                <>
                  {" \u2022 "}
                  <a
                    href={`https://github.com/iwasinminedream/dota-data/commit/${currentEntry.commitSha}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {currentEntry.commitSha.slice(0, 7)}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        <ReportBlock version={currentEntry.version} />
        <VersionContent entry={currentEntry} />
      </>
    );
  };

  if (indexLoading) {
    return (
      <>
        <style>{spinnerKeyframes}</style>
        <NavBar />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
          <div style={{ width: 260, height: "100%", overflowY: "auto", padding: "2px 12px" }} className="api-sidebar">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--color-text-faded, #999)" }}>
              {renderSpinner()} Loading versions...
            </div>
          </div>
          <main style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--color-text-faded, #999)" }}>
              {renderSpinner()} Loading changelog index...
            </div>
          </main>
        </div>
      </>
    );
  }

  if (index.length === 0) {
    return (
      <>
        <NavBar />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
          <div style={{ width: 260, height: "100%", overflowY: "auto", padding: "2px 12px" }} className="api-sidebar">
            <div style={{ color: "var(--color-text-faded, #999)", fontStyle: "italic", padding: 40, textAlign: "center" }}>
              No versions available
            </div>
          </div>
          <main style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", padding: 24 }}>
            <div style={{ color: "var(--color-text-faded, #999)", fontStyle: "italic", padding: 40, textAlign: "center" }}>
              No changelog data available.
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        ${spinnerKeyframes}
        .changelog-sidebar-item:hover { background: var(--color-sidebar-hover) !important; }
        .changelog-top-section-header:hover { background-color: rgba(128,128,128,0.08); }
        .changelog-category-header:hover { background-color: var(--color-group-highlight, rgba(128,128,128,0.08)) !important; }
        .changelog-class-group-header:hover { background-color: var(--color-group-highlight, rgba(128,128,128,0.08)); }
        .changelog-item-row:hover { background-color: var(--color-group-highlight, rgba(128,128,128,0.08)); }
        .changelog-changed-item:hover { background-color: var(--color-group-highlight, rgba(128,128,128,0.08)); }
        .changelog-report { font-size: 14px; line-height: 1.55; color: var(--color-text); overflow-wrap: anywhere; }
        .changelog-report h2 { font-size: 17px; font-weight: 700; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--color-group-border); }
        .changelog-report h3 { font-size: 15px; font-weight: 700; margin: 14px 0 6px; }
        .changelog-report h4, .changelog-report h5, .changelog-report h6 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; }
        .changelog-report p { margin: 6px 0; }
        .changelog-report ul { list-style: disc; margin: 4px 0; padding-left: 22px; }
        .changelog-report ul ul { list-style: circle; }
        .changelog-report ol { list-style: decimal; margin: 4px 0; padding-left: 22px; }
        .changelog-report li { margin: 2px 0; }
        .changelog-report a { color: var(--color-highlight); text-decoration: underline; }
        .changelog-report code { font-family: monospace; font-size: 12.5px; background-color: var(--color-group-members); border-radius: 3px; padding: 1px 4px; }
        .changelog-report pre { background-color: var(--color-group-members); border-radius: 4px; padding: 8px 10px; overflow-x: auto; margin: 6px 0; }
        .changelog-report pre code { padding: 0; background: none; }
        .changelog-report blockquote { border-left: 3px solid var(--color-group-border); padding-left: 10px; color: var(--color-text-dim); margin: 6px 0; }
        .changelog-report table { display: block; overflow-x: auto; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
        .changelog-report th, .changelog-report td { border: 1px solid var(--color-group-border); padding: 3px 8px; }
        .changelog-report th { background-color: var(--color-group-members); font-weight: 600; }
        .changelog-report details { border: 1px solid var(--color-group-border); border-radius: 4px; padding: 4px 10px; margin: 8px 0; }
        .changelog-report summary { cursor: pointer; font-weight: 600; }
        .changelog-report hr { border: none; border-top: 1px solid var(--color-group-border); margin: 12px 0; }
        @media (max-width: 1100px) { .api-sidebar { width: 200px !important; } }
        @media (max-width: 768px) { .api-sidebar { width: 100% !important; max-height: 40vh; border-bottom: 1px solid var(--color-group-border); } .api-page-content { flex-direction: column; } }
      `}</style>
      <NavBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
        <div style={{ width: 260, height: "100%", overflowY: "auto", padding: "2px 12px" }} className="api-sidebar">
          {index.map((entry) => (
            <a
              key={entry.version}
              href={`${base}api/changelog/${entry.version}/`}
              onClick={(e) => { e.preventDefault(); selectVersion(entry.version); }}
              className="changelog-sidebar-item"
              style={{
                background: selectedVersion === entry.version ? "var(--color-sidebar-hover)" : "var(--color-sidebar)",
                borderBottom: selectedVersion === entry.version ? "3px solid var(--color-highlight)" : "3px solid transparent",
                borderRadius: 3, padding: "4px 8px 2px 8px", textDecoration: "none", color: "var(--color-text)",
                fontWeight: selectedVersion === entry.version ? 600 : "normal",
                display: "flex", alignItems: "center", fontSize: 13, marginBottom: 3,
              }}
            >
              <span>v{entry.version} - {entry.date}</span>
              {(entry.addedCount !== undefined || entry.removedCount !== undefined) && (
                <span style={{ fontSize: 11, marginLeft: 8 }}>
                  {entry.addedCount ? <span style={{ color: "#10b981" }}>+{entry.addedCount}</span> : null}
                  {entry.removedCount ? <span style={{ color: "#ef4444", marginLeft: 4 }}>-{entry.removedCount}</span> : null}
                  {entry.changedCount ? <span style={{ color: "#f59e0b", marginLeft: 4 }}>~{entry.changedCount}</span> : null}
                </span>
              )}
              {entry.documentationCount ? (
                <span title="Documentation updates" style={{ fontSize: 11, marginLeft: 6, color: DOCS_COLOR }}>
                  &#9998;{entry.documentationCount}
                </span>
              ) : null}
            </a>
          ))}
        </div>
        <main style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", padding: 24 }}>
          {renderContent()}
        </main>
      </div>
    </>
  );
}
