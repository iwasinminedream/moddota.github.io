import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { lighten, darken } from "polished";
import { Link, useLocation } from "react-router-dom";
import abilitiesData from "@moddota/dota-data/files/abilities.json";
import modifiersData from "@moddota/dota-data/files/vscripts/modifier_list.json";
import { ContentWrapper, ListItem, StyledSearchBox, TextMessage } from "~components/layout/Content";
import { SidebarWrapper } from "~components/layout/Sidebar";
import { ScrollableList } from "~components/Lists";
import { useRouterSearch } from "~components/Search";

type KVValue = string | number | KVObject;
type KVObject = { [key: string]: KVValue };

const abilities = abilitiesData as Record<string, KVValue>;

// Build a flat list of all modifiers for lookup
const allModifiers: string[] = Object.values(modifiersData as Record<string, string[]>).flat();

// Map ability name -> matching modifiers
function findModifiers(abilityName: string): string[] {
  // For items: item_blink -> modifier_blink, modifier_item_blink
  // For abilities: antimage_mana_break -> modifier_antimage_mana_break
  const searchName = abilityName.startsWith("item_")
    ? abilityName.replace("item_", "")
    : abilityName;
  return allModifiers.filter(
    (m) => m.includes(`modifier_${searchName}`) || m.includes(`modifier_${abilityName}`),
  );
}

const modifierCache = new Map<string, string[]>();
function getModifiers(abilityName: string): string[] {
  if (!modifierCache.has(abilityName)) {
    modifierCache.set(abilityName, findModifiers(abilityName));
  }
  return modifierCache.get(abilityName)!;
}

interface AbilityEntry {
  name: string;
  category: string;
  kv: KVObject | string;
}

const allAbilities: AbilityEntry[] = Object.entries(abilities)
  .map(([name, kv]) => {
    let category = "other";
    if (name.startsWith("special_bonus_")) {
      category = "talents";
    } else if (name.startsWith("item_")) {
      category = "items";
    } else if (name.startsWith("seasonal_")) {
      category = "seasonal";
    } else if (name.startsWith("ability_") || name === "default_attack" || name === "attribute_bonus") {
      category = "generic";
    } else if (name.startsWith("dota_base") || name.startsWith("dota_empty")) {
      category = "generic";
    } else {
      category = "heroes";
    }
    return { name, category, kv: kv as KVObject | string };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const categoryDefs = [
  { key: "all", label: "All" },
  { key: "heroes", label: "Hero Abilities" },
  { key: "items", label: "Items" },
  { key: "talents", label: "Talents" },
  { key: "generic", label: "Generic" },
  { key: "seasonal", label: "Seasonal" },
  { key: "other", label: "Other" },
];

const categoryCounts = categoryDefs.map((c) => ({
  ...c,
  count: c.key === "all" ? allAbilities.length : allAbilities.filter((a) => a.category === c.key).length,
})).filter((c) => c.count > 0 || c.key === "all");

// --- Styled components ---

const AbilityWrapper = styled.div`
  display: flex;
  flex-flow: column;
  background-color: ${(props) => props.theme.group};
  border: 1px solid ${(props) => props.theme.groupBorder};
  border-top-color: ${(props) => lighten(0.1, props.theme.groupBorder)};
  border-radius: 4px;
  box-shadow: 2px 2px 6px ${(props) => props.theme.groupShadow};
  padding: 8px 12px;
`;

const AbilityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const AbilityName = styled.code`
  font-size: 15px;
  font-weight: 700;
  color: ${(props) => props.theme.highlight};
`;

const CopyButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.textFaded};
  cursor: pointer;
  padding: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  line-height: 1;

  &:hover {
    color: ${(props) => props.theme.highlight};
  }
`;

const KVTable = styled.div`
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid ${(props) => props.theme.groupSeparator};
  font-size: 13px;
`;

const KVRow = styled.div`
  display: flex;
  padding: 2px 0;
  align-items: baseline;

  &:hover {
    background: ${(props) => props.theme.sidebar};
    border-radius: 2px;
  }
`;

const KVKey = styled.span`
  color: ${(props) => props.theme.textFaded};
  min-width: 220px;
  flex-shrink: 0;
  font-weight: 500;
  font-family: monospace;
  font-size: 12px;
`;

const KVVal = styled.span`
  color: ${(props) => props.theme.text};
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
`;

const KVNested = styled.div`
  margin-left: 16px;
  padding-left: 8px;
  border-left: 1px solid ${(props) => props.theme.groupBorder};
`;

const NestedToggle = styled.span`
  cursor: pointer;
  color: ${(props) => props.theme.highlight};
  font-size: 11px;
  margin-left: 4px;
  user-select: none;
`;

const AbilityValuesRaw = styled.pre`
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  color: ${(props) => props.theme.text};
  white-space: pre-wrap;
  word-break: break-all;
`;

const ModifiersSection = styled.div`
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid ${(props) => props.theme.groupSeparator};
`;

const ModifiersLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => props.theme.textFaded};
`;

const ModifierTag = styled.code`
  display: block;
  font-size: 11px;
  padding: 1px 6px;
  margin: 2px 0;
  border-radius: 3px;
  background: ${(props) => props.theme.sidebar};
  color: ${(props) => props.theme.text};
`;

const SidebarLinkStyled = styled(Link)<{ $isActive?: boolean }>`
  background: ${(props) => (props.$isActive ? darken(0.09, props.theme.sidebar) : props.theme.sidebar)};
  border-bottom: 3px solid ${(props) => (props.$isActive ? props.theme.highlight : "transparent")};
  border-radius: 3px;
  padding: 4px 6px;
  text-decoration: none;
  color: ${(props) => props.theme.text};
  word-break: break-all;
  font-weight: ${(props) => (props.$isActive ? 600 : "normal")};
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;

  :not(:last-child) {
    margin-bottom: 3px;
  }

  &:hover {
    background: ${(props) => darken(0.09, props.theme.sidebar)};
  }
`;

const CountBadge = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: ${(props) => props.theme.textFaded};
  font-weight: normal;
`;

// --- KV to Valve KV text format ---

function kvToText(obj: KVValue, indent: number = 0): string {
  const pad = "\t".repeat(indent);
  if (typeof obj === "string") return `"${obj}"`;
  if (typeof obj === "number") return `"${obj}"`;
  if (typeof obj !== "object" || obj === null) return `"${obj}"`;

  const lines: string[] = [];
  lines.push("{");
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      lines.push(`${pad}\t"${key}"`);
      lines.push(`${pad}\t${kvToText(value, indent + 1)}`);
    } else {
      lines.push(`${pad}\t"${key}"\t\t"${value}"`);
    }
  }
  lines.push(`${pad}}`);
  return lines.join("\n");
}

function abilityToKVText(name: string, kv: KVValue): string {
  if (typeof kv !== "object" || kv === null) return `"${name}"\t\t"${kv}"`;
  return `"${name}"\n${kvToText(kv, 0)}`;
}

// --- Renders nested KV (except AbilityValues) ---

function KVValueRenderer({ value, depth = 0 }: { value: KVValue; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (typeof value === "string" || typeof value === "number") {
    return <KVVal>{String(value)}</KVVal>;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <KVVal>{"{}"}</KVVal>;

    return (
      <div>
        <NestedToggle onClick={() => setExpanded(!expanded)}>
          {expanded ? "[-]" : `[+] (${entries.length} fields)`}
        </NestedToggle>
        {expanded && (
          <KVNested>
            {entries.map(([k, v]) => {
              if (typeof v === "object" && v !== null) {
                return (
                  <div key={k}>
                    <KVRow>
                      <KVKey>{k}</KVKey>
                      <KVValueRenderer value={v} depth={depth + 1} />
                    </KVRow>
                  </div>
                );
              }
              return (
                <KVRow key={k}>
                  <KVKey>{k}</KVKey>
                  <KVVal>{String(v)}</KVVal>
                </KVRow>
              );
            })}
          </KVNested>
        )}
      </div>
    );
  }

  return <KVVal>{String(value)}</KVVal>;
}

// --- Ability item ---

function AbilityItem({ ability }: { ability: AbilityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const kv = ability.kv;

  const handleCopy = useCallback(() => {
    const text = abilityToKVText(ability.name, ability.kv);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [ability]);

  return (
    <AbilityWrapper>
      <AbilityHeader onClick={() => setExpanded(!expanded)}>
        <AbilityName>
          {expanded ? "[-]" : "[+]"} {ability.name}
        </AbilityName>
        <CopyButton title={copied ? "Copied!" : "Copy KV"} onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          )}
        </CopyButton>
      </AbilityHeader>
      {expanded && (() => {
        const mods = getModifiers(ability.name);
        if (mods.length === 0) return null;
        return (
          <ModifiersSection>
            <ModifiersLabel>Modifiers: </ModifiersLabel>
            {mods.map((m) => <ModifierTag key={m}>{m}</ModifierTag>)}
          </ModifiersSection>
        );
      })()}
      {expanded && typeof kv === "object" && kv !== null && (() => {
        const entries = Object.entries(kv);
        const abilityValues = entries.filter(([key]) => key === "AbilityValues");
        const rest = entries.filter(([key]) => key !== "AbilityValues");
        return (
        <KVTable>
          {rest.map(([key, value]) => (
              <KVRow key={key}>
                <KVKey>{key}</KVKey>
                {typeof value === "object" && value !== null ? (
                  <KVValueRenderer value={value} depth={1} />
                ) : (
                  <KVVal>{String(value)}</KVVal>
                )}
              </KVRow>
          ))}
          {abilityValues.map(([key, value]) => (
            <KVRow key={key} style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <KVKey>{key}</KVKey>
              <AbilityValuesRaw>{kvToText(value, 0)}</AbilityValuesRaw>
            </KVRow>
          ))}
        </KVTable>
        );
      })()}
      {expanded && typeof kv === "string" && (
        <KVTable>
          <KVVal>{kv}</KVVal>
        </KVTable>
      )}
    </AbilityWrapper>
  );
}

function renderItem(ability: AbilityEntry, style?: React.CSSProperties) {
  return (
    <ListItem style={style} key={ability.name}>
      <AbilityItem ability={ability} />
    </ListItem>
  );
}

export default function AbilitiesPage() {
  const searchQuery = useRouterSearch();
  const location = useLocation();
  const selectedCategory = new URLSearchParams(location.search).get("category") || "all";

  const filteredAbilities = useMemo(() => {
    let filtered = allAbilities;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((a) => a.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [selectedCategory, searchQuery]);

  const currentPath = location.pathname + location.search;

  return (
    <>
      <SidebarWrapper>
        {categoryCounts.map((cat) => (
          <SidebarLinkStyled
            key={cat.key}
            to={`/abilities${cat.key === "all" ? "" : `?category=${cat.key}`}`}
            $isActive={
              cat.key === "all"
                ? currentPath === "/abilities"
                : currentPath === `/abilities?category=${cat.key}`
            }
          >
            {cat.label}
            <CountBadge>{cat.count}</CountBadge>
          </SidebarLinkStyled>
        ))}
      </SidebarWrapper>

      <ContentWrapper>
        <StyledSearchBox baseUrl="/abilities" />

        {filteredAbilities.length > 0 ? (
          <ScrollableList data={filteredAbilities} render={renderItem} />
        ) : (
          <TextMessage>No abilities found</TextMessage>
        )}
      </ContentWrapper>
    </>
  );
}
