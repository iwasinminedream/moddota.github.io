import React, { useState, useEffect, useCallback, useMemo } from "react";
import styled from "styled-components";
import { transparentize } from "polished";
import { useHistory, useParams } from "react-router-dom";
import { ContentWrapper } from "~components/layout/Content";
import { SidebarWrapper, SidebarItem } from "~components/layout/Sidebar";
import {
  CommonGroupWrapper,
} from "~components/Docs/utils/styles";

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

const changelogCache = new Map<string, ChangelogEntry>();
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
const CHANGELOG_BASE_URL = isDev
  ? "/changelog-data/changelogs"
  : "https://raw.githubusercontent.com/iceyellowc/dota-data/master/files/changelogs";
const CHANGELOG_INDEX_URL = isDev
  ? "/changelog-data/changelog-index.json"
  : "https://raw.githubusercontent.com/iceyellowc/dota-data/master/files/changelog-index.json";

let indexCache: IndexEntry[] | null = null;

function clearChangelogCache() {
  indexCache = null;
  changelogCache.clear();
}

if (isDev && typeof window !== "undefined") {
  setInterval(clearChangelogCache, 5000);
}

async function loadChangelogIndex(): Promise<IndexEntry[]> {
  if (indexCache) return indexCache;
  try {
    const response = await fetch(CHANGELOG_INDEX_URL);
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
    const response = await fetch(`${CHANGELOG_BASE_URL}/${version}.json`);
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

const sectionConfig: Record<SectionType, { label: string; color: string; bgAlpha: number; icon: string }> = {
  changed: { label: "Changes", color: "#f59e0b", bgAlpha: 0.07, icon: "~" },
  added: { label: "Additions", color: "#10b981", bgAlpha: 0.07, icon: "+" },
  removed: { label: "Removals", color: "#ef4444", bgAlpha: 0.07, icon: "-" },
};

// Category display order
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

// ─── Styled components ──────────────────────────────────────────────────────────

// Top-level section block (Changed / Added / Removed)
const TopSectionBlock = styled.div<{ $sectionType: SectionType }>`
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid ${(props) => transparentize(0.7, sectionConfig[props.$sectionType].color)};
  background-color: ${(props) => {
    const cfg = sectionConfig[props.$sectionType];
    return transparentize(1 - cfg.bgAlpha, cfg.color);
  }};
  margin-bottom: 10px;
`;

const TopSectionHeader = styled.div<{ $sectionType: SectionType }>`
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  gap: 10px;
  transition: background-color 0.15s;

  &:hover {
    background-color: ${(props) => transparentize(0.85, sectionConfig[props.$sectionType].color)};
  }
`;

const TopSectionIcon = styled.span<{ $sectionType: SectionType }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 18px;
  color: white;
  background-color: ${(props) => sectionConfig[props.$sectionType].color};
  flex-shrink: 0;
`;

const TopSectionTitle = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${(props) => props.theme.text};
`;

const TopSectionCount = styled.span`
  font-size: 13px;
  color: ${(props) => props.theme.textFaded};
  margin-left: auto;
`;

const CollapseArrow = styled.span<{ $collapsed: boolean }>`
  font-size: 10px;
  color: ${(props) => props.theme.textFaded};
  transition: transform 0.2s;
  transform: rotate(${(props) => (props.$collapsed ? "-90deg" : "0deg")});
`;

const TopSectionBody = styled.div`
  padding: 0 10px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// Category sub-block (Lua API, Panorama Events, etc.)
const CategoryBlock = styled.div`
  background-color: ${(props) => props.theme.group};
  border: 1px solid ${(props) => props.theme.groupBorder};
  border-radius: 4px;
  overflow: hidden;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => props.theme.text};
  background-color: ${(props) => props.theme.group};
  transition: background-color 0.15s;

  &:hover {
    background-color: ${(props) => props.theme.groupHighlight};
  }
`;

const CategoryName = styled.span`
  flex: 1;
`;

const CategoryCount = styled.span`
  font-size: 11px;
  font-weight: normal;
  color: ${(props) => props.theme.textFaded};
`;

const CategoryBody = styled.div`
  background-color: ${(props) => props.theme.groupMembers};
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

// Class/enum group within a category
const ClassGroup = styled.div`
  &:not(:last-child) {
    margin-bottom: 2px;
  }
`;

const ClassGroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  cursor: pointer;
  user-select: none;
  border-radius: 3px;
  font-size: 13px;
  transition: background-color 0.1s;

  &:hover {
    background-color: ${(props) => props.theme.groupHighlight};
  }
`;

const ClassGroupArrow = styled.span<{ $collapsed: boolean }>`
  font-size: 8px;
  color: ${(props) => props.theme.textFaded};
  transition: transform 0.15s;
  transform: rotate(${(props) => (props.$collapsed ? "0deg" : "90deg")});
  width: 10px;
`;

const ClassGroupName = styled.span`
  font-weight: 600;
  color: #2563eb;
`;

const EnumGroupName = styled.span`
  font-weight: 600;
  color: #7c3aed;
`;

const ClassGroupCount = styled.span`
  font-size: 11px;
  color: ${(props) => props.theme.textFaded};
`;

const ClassGroupBody = styled.div`
  margin-left: 22px;
  padding: 2px 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

// Individual items
const ItemRow = styled.div`
  font-family: monospace;
  font-size: 13px;
  color: ${(props) => props.theme.text};
  padding: 2px 6px;
  border-radius: 3px;

  &:hover {
    background-color: ${(props) => props.theme.groupHighlight};
  }
`;

const ItemName = styled.span`
  font-weight: 500;
`;

const ItemSignature = styled.span`
  color: ${(props) => props.theme.highlight};
  font-weight: 500;
`;

const ItemValue = styled.span`
  color: ${(props) => props.theme.textDim};
  font-size: 12px;
`;

const ItemClassName = styled.span`
  color: #2563eb;
  font-weight: 600;
`;

const ItemEnumName = styled.span`
  color: #7c3aed;
  font-weight: 600;
`;

// Changed item diff display
const ChangedItemBlock = styled.div`
  padding: 4px 6px;
  border-radius: 3px;

  &:hover {
    background-color: ${(props) => props.theme.groupHighlight};
  }

  &:not(:last-child) {
    margin-bottom: 4px;
  }
`;

const ChangedItemName = styled.div`
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const DiffBlock = styled.div`
  margin: 2px 0 4px 12px;
`;

const DiffFieldLabel = styled.span`
  font-weight: 600;
  color: ${(props) => props.theme.textFaded};
  margin-right: 6px;
  font-size: 11px;
  text-transform: uppercase;
`;

const DiffRow = styled.div`
  font-family: monospace;
  font-size: 12px;
  margin: 1px 0;
  padding: 2px 8px;
  border-radius: 3px;
`;

const DiffOld = styled(DiffRow)`
  background-color: rgba(239, 68, 68, 0.1);
  color: ${(props) => props.theme.text};
  border-left: 3px solid #ef4444;
  &::before {
    content: "- ";
    color: #ef4444;
    font-weight: bold;
  }
`;

const DiffNew = styled(DiffRow)`
  background-color: rgba(16, 185, 129, 0.1);
  color: ${(props) => props.theme.text};
  border-left: 3px solid #10b981;
  &::before {
    content: "+ ";
    color: #10b981;
    font-weight: bold;
  }
`;

// Ability/Unit items
const AbilityName = styled.span`
  font-weight: 600;
  color: #d97706;
`;

const UnitName = styled.span`
  font-weight: 600;
  color: #0891b2;
`;

const KvPropertyName = styled.span`
  font-weight: 600;
  color: #7c3aed;
`;

const KvBlock = styled.div`
  margin: 2px 0 2px 16px;
  font-family: monospace;
  font-size: 12px;
`;

const KvBlockHeader = styled.div`
  font-weight: 600;
  color: ${(props) => props.theme.textFaded};
  font-size: 12px;
  margin-bottom: 1px;
`;

const KvFieldRow = styled.div`
  margin: 1px 0;
  padding: 1px 6px;
  font-family: monospace;
  font-size: 12px;
`;

const KvFieldName = styled.span`
  color: ${(props) => props.theme.textFaded};
`;

const KvOldValue = styled.span`
  color: #ef4444;
  text-decoration: line-through;
  margin-right: 4px;
`;

const KvNewValue = styled.span`
  color: #10b981;
  font-weight: 500;
`;

const KvUnchangedValue = styled.span`
  color: ${(props) => props.theme.textDim};
`;

const KvArrow = styled.span`
  color: ${(props) => props.theme.textFaded};
  margin: 0 4px;
`;

// Version header
const VersionHeaderCard = styled(CommonGroupWrapper)`
  margin: 6px;
`;

const VersionHeaderInner = styled.div`
  padding: 8px 12px;
`;

const VersionTitle = styled.h2`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 700;
`;

const VersionMeta = styled.p`
  margin: 0;
  color: ${(props) => props.theme.textFaded};
  font-size: 13px;
`;

const CommitLink = styled.a`
  color: inherit;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

// Sidebar
const SidebarChangeCounts = styled.span`
  font-size: 11px;
  margin-left: 8px;
`;

const AddedCount = styled.span`
  color: #10b981;
`;

const RemovedCount = styled.span`
  color: #ef4444;
  margin-left: 4px;
`;

const ChangedCount = styled.span`
  color: #f59e0b;
  margin-left: 4px;
`;

// States
const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: ${(props) => props.theme.textFaded};
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 3px solid ${(props) => props.theme.groupBorder};
  border-top-color: ${(props) => props.theme.highlight};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 12px;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorState = styled.div`
  padding: 20px;
  text-align: center;
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
  margin: 6px;
`;

const NoChanges = styled.div`
  color: ${(props) => props.theme.textFaded};
  font-style: italic;
  padding: 40px;
  text-align: center;
`;

// ─── Helpers ────────────────────────────────────────────────────────────────────

const diffFieldLabels: Record<string, string> = {
  returns: "Returns",
  value: "Value",
  description: "Description",
  signature: "Signature",
};


/** Determine group key for an added/removed item. */
function getGroupKey(item: { type?: string; class?: string; enum?: string; category?: string }): string {
  if (item.type === "method" || item.type === "function") {
    return item.class || "Global Functions";
  }
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

/** Determine group key for a changed item. */
function getChangedGroupKey(item: { type?: string; class?: string; enum?: string }): string {
  if (item.type === "method" || item.type === "function") return item.class || "Global Functions";
  if (item.type === "enum_member") return item.enum || "Enums";
  if (item.type === "ability") return "__abilities__";
  if (item.type === "unit") return "__units__";
  return item.type || "Other";
}

/** Sort group entries: special groups (__classes__ etc.) first, then named classes alphabetically. */
function sortGroups<T>(entries: [string, T[]][]): [string, T[]][] {
  return entries.sort((a, b) => {
    const aSpecial = a[0].startsWith("__");
    const bSpecial = b[0].startsWith("__");
    if (aSpecial !== bSpecial) return aSpecial ? -1 : 1;
    return a[0].localeCompare(b[0]);
  });
}

/** Display label for special group keys. */
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

/** Group items by a key function. */
function groupItemsBy<T>(items: T[], keyFn: (item: T) => string): [string, T[]][] {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return sortGroups(Object.entries(groups));
}

/** Reorganize changelog data: { changed, added, removed } each containing category sub-arrays sorted. */
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
  if (item.type === "class") return <ItemClassName>{item.name}</ItemClassName>;
  if (item.type === "enum") return <ItemEnumName>{item.name}</ItemEnumName>;
  if (item.type === "method" || item.type === "function") {
    return (
      <>
        <ItemSignature>{item.signature || item.name}</ItemSignature>
        {item.returns && <ItemValue> → {item.returns}</ItemValue>}
      </>
    );
  }
  if (item.type === "enum_member") {
    return (
      <>
        <ItemName>{item.name}</ItemName>
        {item.value !== undefined && <ItemValue> = {item.value}</ItemValue>}
      </>
    );
  }
  if (item.type === "event") {
    return (
      <>
        <ItemName>{item.name}</ItemName>
        {item.fieldsDetail && <ItemValue> ({item.fieldsDetail})</ItemValue>}
      </>
    );
  }
  if (item.type === "constant" || item.type === "const") {
    return (
      <>
        <ItemName>{item.name}</ItemName>
        {item.value !== undefined && <ItemValue> = {item.value}</ItemValue>}
      </>
    );
  }
  if (item.type === "ability") return <AbilityName>{item.name}</AbilityName>;
  if (item.type === "unit") return <UnitName>{item.name}</UnitName>;
  if (item.type === "kv_property") return <KvPropertyName>{item.name}</KvPropertyName>;
  return <ItemName>{item.name || JSON.stringify(item)}</ItemName>;
}

/** Check if a value is a leaf diff { old, new }. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLeafDiff(v: any): v is { old: unknown; new: unknown } {
  return typeof v === "object" && v !== null && "old" in v && "new" in v;
}

/** Format a value for KV display. */
function formatKvValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Render a KV leaf diff: "key": old => new, or just old => new for value changes. */
function renderKvLeaf(key: string, old: unknown, newVal: unknown): React.ReactNode {
  const oldStr = formatKvValue(old);
  const newStr = formatKvValue(newVal);
  const changed = oldStr !== newStr;

  return (
    <KvFieldRow key={key}>
      <KvFieldName>"{key}": </KvFieldName>
      {changed ? (
        <>
          <KvOldValue>{oldStr || '""'}</KvOldValue>
          <KvArrow>→</KvArrow>
          <KvNewValue>{newStr || '""'}</KvNewValue>
        </>
      ) : (
        <KvUnchangedValue>{oldStr}</KvUnchangedValue>
      )}
    </KvFieldRow>
  );
}

/** Recursively render KV-style changes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderKvChanges(changes: Record<string, any>): React.ReactNode {
  return Object.entries(changes).map(([key, value]) => {
    if (isLeafDiff(value)) {
      // Simple property: "key": old → new
      const oldStr = formatKvValue(value.old);
      const newStr = formatKvValue(value.new);
      return (
        <KvFieldRow key={key}>
          <KvFieldName>"{key}": </KvFieldName>
          <KvOldValue>{oldStr || '""'}</KvOldValue>
          <KvArrow>→</KvArrow>
          <KvNewValue>{newStr || '""'}</KvNewValue>
        </KvFieldRow>
      );
    }
    // Nested object (e.g. AbilityValues sub-entry): show block with all fields
    const entries = Object.entries(value);
    const allLeaves = entries.every(([, v]) => isLeafDiff(v));

    if (allLeaves) {
      // All children are leaf diffs — render as a KV block with all fields
      return (
        <KvBlock key={key}>
          <KvBlockHeader>{key}</KvBlockHeader>
          {entries.map(([subKey, subVal]: [string, any]) =>
            renderKvLeaf(subKey, subVal.old, subVal.new),
          )}
        </KvBlock>
      );
    }

    // Mixed nested (e.g. AbilityValues containing both object and simple sub-entries)
    return (
      <KvBlock key={key}>
        <KvBlockHeader>{key}</KvBlockHeader>
        {renderKvChanges(value)}
      </KvBlock>
    );
  });
}

function renderChangedItem(item: ChangedItem): React.ReactNode {
  const isAbilityOrUnit = item.type === "ability" || item.type === "unit";
  const NameComponent = item.type === "ability" ? AbilityName : item.type === "unit" ? UnitName : ItemSignature;

  if (isAbilityOrUnit) {
    return (
      <ChangedItemBlock>
        <ChangedItemName>
          <NameComponent>{item.name}</NameComponent>
        </ChangedItemName>
        {renderKvChanges(item.changes)}
      </ChangedItemBlock>
    );
  }

  return (
    <ChangedItemBlock>
      <ChangedItemName>
        <NameComponent>{item.name}</NameComponent>
      </ChangedItemName>
      {Object.entries(item.changes).map(([field, diff]) => (
        <DiffBlock key={field}>
          {diffFieldLabels[field] && (
            <DiffFieldLabel>{diffFieldLabels[field]}:</DiffFieldLabel>
          )}
          <DiffOld>{diff.old || "(empty)"}</DiffOld>
          <DiffNew>{diff.new || "(empty)"}</DiffNew>
        </DiffBlock>
      ))}
    </ChangedItemBlock>
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

  return (
    <ClassGroup>
      <ClassGroupHeader onClick={() => toggleKey(fullKey)}>
        <ClassGroupArrow $collapsed={isCollapsed}>&#9654;</ClassGroupArrow>
        {isSpecial ? (
          <ItemName>{label}</ItemName>
        ) : isEnum ? (
          <EnumGroupName>{label}</EnumGroupName>
        ) : (
          <ClassGroupName>{label}</ClassGroupName>
        )}
        <ClassGroupCount>({items.length})</ClassGroupCount>
      </ClassGroupHeader>
      {!isCollapsed && (
        <ClassGroupBody>
          {sectionType === "changed"
            ? items.map((item, i) => <div key={i}>{renderChangedItem(item as ChangedItem)}</div>)
            : items.map((item, i) => (
                <ItemRow key={i}>{renderAddedRemovedItem(item as ChangeItem)}</ItemRow>
              ))}
        </ClassGroupBody>
      )}
    </ClassGroup>
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
    <CategoryBlock>
      <CategoryHeader onClick={() => toggleKey(catKey)}>
        <CollapseArrow $collapsed={isCatCollapsed}>&#9660;</CollapseArrow>
        <CategoryName>{categoryName}</CategoryName>
        <CategoryCount>{items.length} items</CategoryCount>
      </CategoryHeader>
      {!isCatCollapsed && (
        <CategoryBody>
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
        </CategoryBody>
      )}
    </CategoryBlock>
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
    <TopSectionBlock $sectionType={sectionType}>
      <TopSectionHeader $sectionType={sectionType} onClick={() => toggleKey(topKey)}>
        <TopSectionIcon $sectionType={sectionType}>{cfg.icon}</TopSectionIcon>
        <TopSectionTitle>{cfg.label}</TopSectionTitle>
        <TopSectionCount>{totalItems} items</TopSectionCount>
        <CollapseArrow $collapsed={isCollapsed}>&#9660;</CollapseArrow>
      </TopSectionHeader>
      {!isCollapsed && (
        <TopSectionBody>
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
        </TopSectionBody>
      )}
    </TopSectionBlock>
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

  // Auto-collapse modifier groups
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
    return <NoChanges>No API changes detected in this version</NoChanges>;
  }

  return (
    <div style={{ padding: "0 6px" }}>
      <TopSection
        sectionType="changed"
        categories={sections.changed}
        collapsedKeys={collapsedKeys}
        toggleKey={toggleKey}
      />
      <TopSection
        sectionType="added"
        categories={sections.added}
        collapsedKeys={collapsedKeys}
        toggleKey={toggleKey}
      />
      <TopSection
        sectionType="removed"
        categories={sections.removed}
        collapsedKeys={collapsedKeys}
        toggleKey={toggleKey}
      />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function Changelog() {
  const { version: urlVersion } = useParams<{ version?: string }>();
  const history = useHistory();

  const [index, setIndex] = useState<IndexEntry[]>([]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "error">("idle");
  const [currentEntry, setCurrentEntry] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    loadChangelogIndex().then((data) => {
      setIndex(data);
      setIndexLoading(false);
    });
  }, []);

  const selectedVersion = urlVersion || (index[0]?.version ?? "");

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

  useEffect(() => {
    if (!urlVersion && index.length > 0) history.replace(`/changelog/${index[0].version}`);
  }, [urlVersion, index, history]);

  if (indexLoading) {
    return (
      <>
        <SidebarWrapper>
          <LoadingState>
            <LoadingSpinner />
            Loading versions...
          </LoadingState>
        </SidebarWrapper>
        <ContentWrapper>
          <LoadingState>
            <LoadingSpinner />
            Loading changelog index...
          </LoadingState>
        </ContentWrapper>
      </>
    );
  }

  if (index.length === 0) {
    return (
      <>
        <SidebarWrapper>
          <NoChanges>No versions available</NoChanges>
        </SidebarWrapper>
        <ContentWrapper>
          <NoChanges>No changelog data available.</NoChanges>
        </ContentWrapper>
      </>
    );
  }

  const renderContent = () => {
    if (loadingState === "loading") {
      return (
        <LoadingState>
          <LoadingSpinner />
          Loading changelog for version {selectedVersion}...
        </LoadingState>
      );
    }
    if (loadingState === "error") {
      return <ErrorState>Failed to load changelog for version {selectedVersion}.</ErrorState>;
    }
    if (!currentEntry) {
      return <NoChanges>Select a version from the sidebar</NoChanges>;
    }
    return (
      <>
        <VersionHeaderCard>
          <VersionHeaderInner>
            <VersionTitle>Version {currentEntry.version}</VersionTitle>
            <VersionMeta>
              {currentEntry.date}
              {currentEntry.time && ` at ${currentEntry.time}`}
              {currentEntry.commitSha && (
                <>
                  {" \u2022 "}
                  <CommitLink
                    href={`https://github.com/iwasinminedream/dota-data/commit/${currentEntry.commitSha}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {currentEntry.commitSha.slice(0, 7)}
                  </CommitLink>
                </>
              )}
            </VersionMeta>
          </VersionHeaderInner>
        </VersionHeaderCard>
        <VersionContent entry={currentEntry} />
      </>
    );
  };

  return (
    <>
      <SidebarWrapper>
        {index.map((entry) => (
          <SidebarItem
            key={entry.version}
            to={`/changelog/${entry.version}`}
            icon="constant"
            text={
              <>
                v{entry.version} - {entry.date}
                {(entry.addedCount !== undefined || entry.removedCount !== undefined) && (
                  <SidebarChangeCounts>
                    {entry.addedCount ? <AddedCount>+{entry.addedCount}</AddedCount> : null}
                    {entry.removedCount ? <RemovedCount>-{entry.removedCount}</RemovedCount> : null}
                    {entry.changedCount ? (
                      <ChangedCount>~{entry.changedCount}</ChangedCount>
                    ) : null}
                  </SidebarChangeCounts>
                )}
              </>
            }
            isActive={entry.version === selectedVersion}
          />
        ))}
      </SidebarWrapper>
      <ContentWrapper>{renderContent()}</ContentWrapper>
    </>
  );
}
