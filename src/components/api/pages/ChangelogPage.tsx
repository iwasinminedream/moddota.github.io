import React, { useState, useEffect, useCallback, useMemo } from "react";
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

interface ChangedItemDiff {
  old: string;
  new: string;
}

interface ChangedItem {
  type?: string;
  name?: string;
  class?: string;
  enum?: string;
  category?: string;
  changes: Record<string, ChangedItemDiff>;
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
}

interface IndexEntry {
  version: string;
  date: string;
  time?: string;
  addedCount?: number;
  removedCount?: number;
  changedCount?: number;
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
  "Lua Types",
];

function getCategorySort(name: string): number {
  const idx = categoryOrder.indexOf(name);
  return idx === -1 ? categoryOrder.length : idx;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const diffFieldLabels: Record<string, string> = {
  returns: "Returns",
  value: "Value",
  fieldsDetail: "Fields",
  description: "Description",
  signature: "Signature",
};

function parseFieldsDetail(s: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!s) return result;
  for (const part of s.split(/, (?=[A-Z])/)) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      result[part.slice(0, eq)] = part.slice(eq + 1);
    }
  }
  return result;
}

interface FieldDiff {
  key: string;
  old?: string;
  new?: string;
  subDiffs?: { key: string; old?: string; new?: string }[];
}

function tryParseJsonObject(s: string): Record<string, unknown> | null {
  if (!s || s[0] !== "{") return null;
  try {
    const parsed = JSON.parse(s);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }
  return null;
}

function formatSubValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v !== "object") return String(v);
  return JSON.stringify(v);
}

function diffFieldsDetail(oldStr: string, newStr: string): FieldDiff[] {
  const oldMap = parseFieldsDetail(oldStr);
  const newMap = parseFieldsDetail(newStr);
  const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  const diffs: FieldDiff[] = [];
  for (const key of allKeys) {
    if (oldMap[key] !== newMap[key]) {
      const oldObj = tryParseJsonObject(oldMap[key]);
      const newObj = tryParseJsonObject(newMap[key]);
      if (oldObj && newObj) {
        const subKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
        const subDiffs: { key: string; old?: string; new?: string }[] = [];
        for (const sk of subKeys) {
          const ov = formatSubValue(oldObj[sk]);
          const nv = formatSubValue(newObj[sk]);
          if (ov !== nv) {
            subDiffs.push({ key: sk, old: ov || undefined, new: nv || undefined });
          }
        }
        if (subDiffs.length > 0) {
          diffs.push({ key, subDiffs });
        }
      } else {
        diffs.push({ key, old: oldMap[key], new: newMap[key] });
      }
    }
  }
  return diffs;
}

function getGroupKey(item: { type?: string; class?: string; enum?: string; category?: string }): string {
  if (item.type === "method" || item.type === "function") return item.class || "Global Functions";
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
  if (item.type === "property") return item.class || "Properties";
  return item.type || "Other";
}

function getChangedGroupKey(item: { type?: string; class?: string; enum?: string }): string {
  if (item.type === "method" || item.type === "function") return item.class || "Global Functions";
  if (item.type === "enum_member") return item.enum || "Enums";
  if (item.type === "ability") return "__abilities__";
  if (item.type === "unit") return "__units__";
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

  const catEntries = Object.entries(changes).sort(
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
  if (item.type === "ability") return <span style={{ fontWeight: 600, color: "#d97706" }}>{item.name}</span>;
  if (item.type === "unit") return <span style={{ fontWeight: 600, color: "#0891b2" }}>{item.name}</span>;
  if (item.type === "kv_property") return <span style={{ fontWeight: 600, color: "#7c3aed" }}>{item.name}</span>;
  return <span style={{ fontWeight: 500 }}>{item.name || JSON.stringify(item)}</span>;
}

function renderChangedItem(item: ChangedItem): React.ReactNode {
  const isAbilityOrUnit = item.type === "ability" || item.type === "unit";
  const nameColor = item.type === "ability" ? "#d97706" : item.type === "unit" ? "#0891b2" : "var(--color-highlight)";

  const diffOldStyle: React.CSSProperties = {
    fontFamily: "monospace", fontSize: 12, margin: "1px 0", padding: "2px 8px",
    borderRadius: 3, backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--color-text)",
    borderLeft: "3px solid #ef4444",
  };
  const diffNewStyle: React.CSSProperties = {
    fontFamily: "monospace", fontSize: 12, margin: "1px 0", padding: "2px 8px",
    borderRadius: 3, backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--color-text)",
    borderLeft: "3px solid #10b981",
  };

  return (
    <div className="changelog-changed-item">
      <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        <span style={{ color: nameColor, fontWeight: isAbilityOrUnit ? 600 : 500 }}>{item.name}</span>
      </div>
      {Object.entries(item.changes).map(([field, diff]) => {
        if (isAbilityOrUnit && field === "fieldsDetail") {
          const propDiffs = diffFieldsDetail(diff.old, diff.new);
          if (propDiffs.length === 0) return null;
          return propDiffs.map((pd) => (
            <div key={pd.key} style={{ margin: "2px 0 4px 12px" }}>
              <span style={{ fontWeight: 600, color: "var(--color-text-faded, #999)", fontSize: 12 }}>
                {pd.key}:
              </span>
              {pd.subDiffs ? (
                pd.subDiffs.map((sd) => (
                  <div key={sd.key} style={{ marginLeft: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: "var(--color-text-faded, #999)", fontSize: 12 }}>
                      {sd.key}:
                    </span>
                    {sd.old !== undefined && (
                      <div style={diffOldStyle}>
                        <span style={{ color: "#ef4444", fontWeight: "bold" }}>- </span>{sd.old}
                      </div>
                    )}
                    {sd.new !== undefined && (
                      <div style={diffNewStyle}>
                        <span style={{ color: "#10b981", fontWeight: "bold" }}>+ </span>{sd.new}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <>
                  {pd.old !== undefined && (
                    <div style={diffOldStyle}>
                      <span style={{ color: "#ef4444", fontWeight: "bold" }}>- </span>{pd.old}
                    </div>
                  )}
                  {pd.new !== undefined && (
                    <div style={diffNewStyle}>
                      <span style={{ color: "#10b981", fontWeight: "bold" }}>+ </span>{pd.new}
                    </div>
                  )}
                </>
              )}
            </div>
          ));
        }
        return (
          <div key={field} style={{ margin: "2px 0 4px 12px" }}>
            {diffFieldLabels[field] && (
              <span style={{ fontWeight: 600, color: "var(--color-text-faded, #999)", marginRight: 6, fontSize: 11, textTransform: "uppercase" }}>
                {diffFieldLabels[field]}:
              </span>
            )}
            <div style={diffOldStyle}>
              <span style={{ color: "#ef4444", fontWeight: "bold" }}>- </span>{diff.old || "(empty)"}
            </div>
            <div style={diffNewStyle}>
              <span style={{ color: "#10b981", fontWeight: "bold" }}>+ </span>{diff.new || "(empty)"}
            </div>
          </div>
        );
      })}
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
}: {
  categoryName: string;
  items: (ChangeItem | ChangedItem)[];
  sectionType: SectionType;
  collapsedKeys: Set<string>;
  toggleKey: (key: string) => void;
}) {
  const catKey = `${sectionType}-cat-${categoryName}`;
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
        <span style={{ flex: 1 }}>{categoryName}</span>
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
              collapsePrefix={`${sectionType}-${categoryName}`}
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
}: {
  sectionType: SectionType;
  categories: { category: string; items: (ChangeItem | ChangedItem)[] }[];
  collapsedKeys: Set<string>;
  toggleKey: (key: string) => void;
}) {
  if (categories.length === 0) return null;

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const topKey = `top-${sectionType}`;
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Version content ────────────────────────────────────────────────────────────

function VersionContent({ entry }: { entry: ChangelogEntry }) {
  const sections = useMemo(() => aggregateBySection(entry.changes), [entry]);

  const hasAny =
    sections.changed.length > 0 || sections.added.length > 0 || sections.removed.length > 0;

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

  if (!hasAny) {
    return (
      <div style={{ color: "var(--color-text-faded, #999)", fontStyle: "italic", padding: 40, textAlign: "center" }}>
        No API changes detected in this version
      </div>
    );
  }

  return (
    <div style={{ padding: "0 6px" }}>
      <TopSection sectionType="changed" categories={sections.changed} collapsedKeys={collapsedKeys} toggleKey={toggleKey} />
      <TopSection sectionType="added" categories={sections.added} collapsedKeys={collapsedKeys} toggleKey={toggleKey} />
      <TopSection sectionType="removed" categories={sections.removed} collapsedKeys={collapsedKeys} toggleKey={toggleKey} />
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

  useEffect(() => {
    loadChangelogIndex().then((data) => {
      setIndex(data);
      setIndexLoading(false);
      const path = window.location.pathname;
      const match = path.match(/changelog\/(.+)/);
      const version = match ? match[1] : data[0]?.version ?? "";
      setSelectedVersion(version);
    });
  }, []);

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
    window.history.pushState({}, "", `${base}api/changelog/${v}`);
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
        @media (max-width: 1100px) { .api-sidebar { width: 200px !important; } }
        @media (max-width: 768px) { .api-sidebar { width: 100% !important; max-height: 40vh; border-bottom: 1px solid var(--color-group-border); } .api-page-content { flex-direction: column; } }
      `}</style>
      <NavBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
        <div style={{ width: 260, height: "100%", overflowY: "auto", padding: "2px 12px" }} className="api-sidebar">
          {index.map((entry) => (
            <a
              key={entry.version}
              href={`${base}api/changelog/${entry.version}`}
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
