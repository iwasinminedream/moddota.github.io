import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { lighten, darken } from "polished";
import { Link, useLocation } from "react-router-dom";
import abilitiesData from "@moddota/dota-data/files/abilities.json";
import heroMapData from "@moddota/dota-data/files/ability-hero-map.json";
import modifiersData from "@moddota/dota-data/files/vscripts/modifier_list.json";
import { ContentWrapper, ListItem, StyledSearchBox, TextMessage } from "~components/layout/Content";
import { SidebarWrapper } from "~components/layout/Sidebar";
import { ScrollableList } from "~components/Lists";
import { useRouterSearch } from "~components/Search";

type KVValue = string | number | KVObject;
type KVObject = { [key: string]: KVValue };

const abilities = abilitiesData as Record<string, KVValue>;
const heroMap = heroMapData as Record<string, string>;

// Build flat modifier list for lookup
const allModifiers: string[] = Object.values(modifiersData as Record<string, string[]>).flat();

function findModifiers(abilityName: string): string[] {
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

// --- Categorize abilities ---

interface AbilityEntry {
  name: string;
  category: string;
  kv: KVObject | string;
}

const specialCategories = ["items", "talents", "generic", "seasonal", "other"];

const allAbilities: AbilityEntry[] = Object.entries(abilities)
  .map(([name, kv]) => {
    let category: string;
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
    } else if (heroMap[name]) {
      category = heroMap[name];
    } else {
      category = "other";
    }
    return { name, category, kv: kv as KVObject | string };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Build categories with counts, split hero vs special
const categoryMap = new Map<string, number>();
for (const a of allAbilities) {
  categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
}

const categories = Array.from(categoryMap.entries())
  .map(([name, count]) => ({
    name,
    count,
    isHero: !specialCategories.includes(name),
  }))
  .sort((a, b) => {
    if (a.isHero !== b.isHero) return a.isHero ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

function formatCategoryName(name: string): string {
  return name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// --- Icon helpers ---

function getAbilityIconUrl(name: string): string | null {
  if (name.startsWith("item_")) {
    const itemName = name.replace("item_", "");
    return `images/items/${itemName}_png.png`;
  }
  // Check for AbilityTextureName override
  const kv = abilities[name];
  if (typeof kv === "object" && kv !== null) {
    const textureName = (kv as KVObject).AbilityTextureName;
    if (typeof textureName === "string" && textureName.length > 0) {
      // Could be item reference
      if (textureName.startsWith("item_")) {
        return `images/items/${textureName.replace("item_", "")}_png.png`;
      }
      return `images/spellicons/${textureName}_png.png`;
    }
  }
  return `images/spellicons/${name}_png.png`;
}

function getHeroIconUrl(hero: string): string {
  return `images/heroes/${hero}.png`;
}

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

const AbilityIcon = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: contain;
  flex-shrink: 0;
  background: #1a1a2e;
`;

const AbilityName = styled.code`
  font-size: 15px;
  font-weight: 700;
  color: ${(props) => props.theme.highlight};
`;

const ExpandIndicator = styled.span`
  font-size: 12px;
  color: ${(props) => props.theme.textFaded};
  flex-shrink: 0;
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
  margin-left: auto;

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

// Sidebar

const SidebarLinkStyled = styled(Link)<{ $isActive?: boolean }>`
  background: ${(props) => (props.$isActive ? darken(0.09, props.theme.sidebar) : props.theme.sidebar)};
  border-bottom: 3px solid ${(props) => (props.$isActive ? props.theme.highlight : "transparent")};
  border-radius: 3px;
  padding: 2px 4px 0 4px;
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

const HeroIcon = styled.img`
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 2px;
  flex-shrink: 0;
`;

const CountBadge = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: ${(props) => props.theme.textFaded};
  font-weight: normal;
`;

const SidebarDivider = styled.div`
  border-top: 1px solid ${(props) => props.theme.groupBorder};
  margin: 6px 0;
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

// --- Nested KV renderer ---

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

// --- Ability card ---

function AbilityItem({ ability }: { ability: AbilityEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iconError, setIconError] = useState(false);
  const kv = ability.kv;

  const handleCopy = useCallback(() => {
    const text = abilityToKVText(ability.name, ability.kv);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [ability]);

  const iconUrl = getAbilityIconUrl(ability.name);

  return (
    <AbilityWrapper>
      <AbilityHeader onClick={() => setExpanded(!expanded)}>
        <ExpandIndicator>{expanded ? "[-]" : "[+]"}</ExpandIndicator>
        {iconUrl && !iconError && (
          <AbilityIcon src={iconUrl} alt="" onError={() => setIconError(true)} />
        )}
        <AbilityName>{ability.name}</AbilityName>
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

// --- Page ---

export default function AbilitiesPage() {
  const searchQuery = useRouterSearch();
  const location = useLocation();
  const selectedCategory = new URLSearchParams(location.search).get("category");

  const filteredAbilities = useMemo(() => {
    let filtered = allAbilities;

    if (selectedCategory) {
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
        <SidebarLinkStyled to="/abilities" $isActive={currentPath === "/abilities"}>
          All
          <CountBadge>{allAbilities.length}</CountBadge>
        </SidebarLinkStyled>

        {categories.filter((c) => !c.isHero).map((cat, i, arr) => (
          <React.Fragment key={cat.name}>
            <SidebarLinkStyled
              to={`/abilities?category=${cat.name}`}
              $isActive={currentPath === `/abilities?category=${cat.name}`}
            >
              {formatCategoryName(cat.name)}
              <CountBadge>{cat.count}</CountBadge>
            </SidebarLinkStyled>
            {i === arr.length - 1 && <SidebarDivider />}
          </React.Fragment>
        ))}

        {categories.filter((c) => c.isHero).map((cat) => (
          <SidebarLinkStyled
            key={cat.name}
            to={`/abilities?category=${cat.name}`}
            $isActive={currentPath === `/abilities?category=${cat.name}`}
          >
            <HeroIcon src={getHeroIconUrl(cat.name)} alt="" />
            {formatCategoryName(cat.name)}
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
