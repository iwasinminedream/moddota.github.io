import React, { useCallback, useMemo, useState, useEffect } from "react";
import abilitiesData from "@moddota/dota-data/files/abilities.json";
import heroMapData from "@moddota/dota-data/files/ability-hero-map.json";
import modifiersData from "@moddota/dota-data/files/vscripts/modifier_list.json";
import { ScrollableList } from "../Lists";
import { SearchBox, getSearchFromUrl } from "../Search";
import { fuzzyMatch } from "../../../utils/fuzzySearch";
import { NavBar } from "../layout/NavBar";

type KVValue = string | number | KVObject;
type KVObject = { [key: string]: KVValue };

const abilities = abilitiesData as Record<string, KVValue>;
const heroMap = heroMapData as Record<string, string>;
const allModifiers: string[] = Object.values(modifiersData as Record<string, string[]>).flat();

function findModifiers(abilityName: string): string[] {
  const searchName = abilityName.startsWith("item_") ? abilityName.replace("item_", "") : abilityName;
  return allModifiers.filter((m) => m.includes(`modifier_${searchName}`) || m.includes(`modifier_${abilityName}`));
}

const modifierCache = new Map<string, string[]>();
function getModifiers(abilityName: string): string[] {
  if (!modifierCache.has(abilityName)) modifierCache.set(abilityName, findModifiers(abilityName));
  return modifierCache.get(abilityName)!;
}

interface AbilityEntry { name: string; category: string; kv: KVObject | string; }

const specialCategories = ["items", "talents", "generic", "seasonal", "other"];

const allAbilities: AbilityEntry[] = Object.entries(abilities)
  .map(([name, kv]) => {
    let category: string;
    if (name.startsWith("special_bonus_")) category = "talents";
    else if (name.startsWith("item_")) category = "items";
    else if (name.startsWith("seasonal_")) category = "seasonal";
    else if (name.startsWith("ability_") || name === "default_attack" || name === "attribute_bonus") category = "generic";
    else if (name.startsWith("dota_base") || name.startsWith("dota_empty")) category = "generic";
    else if (heroMap[name]) category = heroMap[name];
    else category = "other";
    return { name, category, kv: kv as KVObject | string };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const categoryMap = new Map<string, number>();
for (const a of allAbilities) categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);

const categories = Array.from(categoryMap.entries())
  .map(([name, count]) => ({ name, count, isHero: !specialCategories.includes(name) }))
  .sort((a, b) => { if (a.isHero !== b.isHero) return a.isHero ? 1 : -1; return a.name.localeCompare(b.name); });

function formatCategoryName(name: string): string {
  return name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function kvToText(obj: KVValue, indent: number = 0): string {
  const pad = "\t".repeat(indent);
  if (typeof obj === "string" || typeof obj === "number") return `"${obj}"`;
  if (typeof obj !== "object" || obj === null) return `"${obj}"`;
  const lines: string[] = ["{"];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) { lines.push(`${pad}\t"${key}"`); lines.push(`${pad}\t${kvToText(value, indent + 1)}`); }
    else lines.push(`${pad}\t"${key}"\t\t"${value}"`);
  }
  lines.push(`${pad}}`);
  return lines.join("\n");
}

function AbilityItem({ ability }: { ability: AbilityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const kv = ability.kv;

  const handleCopy = useCallback(() => {
    const text = typeof kv === "object" ? `"${ability.name}"\n${kvToText(kv, 0)}` : `"${ability.name}"\t\t"${kv}"`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }, [ability]);

  return (
    <div style={{ display: "flex", flexFlow: "column", backgroundColor: "var(--color-group)", border: "1px solid var(--color-group-border)", borderRadius: 4, boxShadow: "2px 2px 6px var(--color-group-shadow)", padding: "8px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: 12, color: "var(--color-text-faded)", flexShrink: 0 }}>{expanded ? "[-]" : "[+]"}</span>
        <code style={{ fontSize: 15, fontWeight: 700, color: "var(--color-highlight)" }}>{ability.name}</code>
        <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} title={copied ? "Copied!" : "Copy KV"} style={{ background: "none", border: "none", color: "var(--color-text-faded)", cursor: "pointer", marginLeft: "auto" }}>
          {copied ? "✓" : "📋"}
        </button>
      </div>

      {expanded && (() => { const mods = getModifiers(ability.name); return mods.length > 0 ? (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--color-group-separator)" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-faded)" }}>Modifiers: </span>
          {mods.map((m) => <code key={m} style={{ display: "block", fontSize: 11, padding: "1px 6px", margin: "2px 0", borderRadius: 3, background: "var(--color-sidebar)", color: "var(--color-text)" }}>{m}</code>)}
        </div>
      ) : null; })()}

      {expanded && typeof kv === "object" && (
        <pre style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--color-group-separator)", fontSize: 12, fontFamily: "monospace", color: "var(--color-text)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {kvToText(kv, 0)}
        </pre>
      )}
    </div>
  );
}

export function AbilitiesPage() {
  const [search, setSearch] = useState(() => getSearchFromUrl());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("category");
  });

  useEffect(() => {
    const handler = () => {
      setSearch(getSearchFromUrl());
      setSelectedCategory(new URLSearchParams(window.location.search).get("category"));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const filteredAbilities = useMemo(() => {
    let filtered = allAbilities;
    if (selectedCategory) filtered = filtered.filter((a) => a.category === selectedCategory);
    if (search) {
      const query = search.replace(/\s+/g, "");
      filtered = filtered
        .map((a) => ({ item: a, score: Math.min(fuzzyMatch(a.name, query), fuzzyMatch(a.category, query)) }))
        .filter((x) => isFinite(x.score))
        .sort((a, b) => a.score - b.score)
        .map((x) => x.item);
    }
    return filtered;
  }, [selectedCategory, search]);

  const base = typeof window !== "undefined" ? document.querySelector("base")?.getAttribute("href") || "" : "";

  return (
    <>
      <NavBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
        <div style={{ width: 340, height: "100%", overflowY: "scroll", padding: "2px 12px" }} className="api-sidebar">
          <SidebarLink href={`${base}api/abilities`} active={!selectedCategory}>All <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-faded)" }}>{allAbilities.length}</span></SidebarLink>
          {categories.filter((c) => !c.isHero).map((cat) => (
            <SidebarLink key={cat.name} href={`${base}api/abilities?category=${cat.name}`} active={selectedCategory === cat.name}>
              {formatCategoryName(cat.name)} <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-faded)" }}>{cat.count}</span>
            </SidebarLink>
          ))}
          <div style={{ borderTop: "1px solid var(--color-group-border)", margin: "6px 0" }} />
          {categories.filter((c) => c.isHero).map((cat) => (
            <SidebarLink key={cat.name} href={`${base}api/abilities?category=${cat.name}`} active={selectedCategory === cat.name}>
              {formatCategoryName(cat.name)} <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-faded)" }}>{cat.count}</span>
            </SidebarLink>
          ))}
        </div>
        <main style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", padding: "0 0 0 24px" }}>
          <SearchBox baseUrl="/abilities" />
          {filteredAbilities.length > 0 ? (
            <ScrollableList data={filteredAbilities} render={(a) => (
              <div key={a.name} style={{ padding: 6 }}><AbilityItem ability={a} /></div>
            )} />
          ) : (
            <div style={{ marginTop: 50, alignSelf: "center", fontSize: 42, textAlign: "center" }}>No abilities found</div>
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

function SidebarLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a href={href} style={{
      background: active ? "var(--color-sidebar-hover)" : "var(--color-sidebar)",
      borderBottom: active ? "3px solid var(--color-highlight)" : "3px solid transparent",
      borderRadius: 3, padding: "2px 4px 0 4px", textDecoration: "none", color: "var(--color-text)",
      fontWeight: active ? 600 : "normal", display: "flex", alignItems: "center", gap: 4, fontSize: 13, marginBottom: 3,
    }}>{children}</a>
  );
}
