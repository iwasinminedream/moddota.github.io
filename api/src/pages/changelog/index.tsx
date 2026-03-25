import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { lighten } from "polished";
import { useHistory, useParams } from "react-router-dom";
import { ContentWrapper } from "~components/layout/Content";
import { SidebarWrapper, SidebarItem } from "~components/layout/Sidebar";

// Types for changelog data
interface ChangeItem {
  type?: string;
  name?: string;
  class?: string;
  enum?: string;
  signature?: string;
  description?: string;
  value?: number | string;
  category?: string;
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

// Cache for loaded changelog entries
const changelogCache = new Map<string, ChangelogEntry>();

// Check if running in development mode (localhost)
const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";

// URLs for changelog files - local in dev, GitHub in production
const CHANGELOG_BASE_URL = isDev
  ? "/changelog-data/changelogs"
  : "https://raw.githubusercontent.com/iceyellowc/dota-data/master/files/changelogs";

const CHANGELOG_INDEX_URL = isDev
  ? "/changelog-data/changelog-index.json"
  : "https://raw.githubusercontent.com/iceyellowc/dota-data/master/files/changelog-index.json";

// Cache for the index
let indexCache: IndexEntry[] | null = null;

// Clear cache function for hot reload in dev mode
function clearChangelogCache() {
  indexCache = null;
  changelogCache.clear();
}

// In dev mode, clear cache periodically to pick up changes
if (isDev && typeof window !== "undefined") {
  // Clear cache every 5 seconds in dev mode to pick up file changes
  setInterval(clearChangelogCache, 5000);
}

// Function to load changelog index
async function loadChangelogIndex(): Promise<IndexEntry[]> {
  if (indexCache) {
    return indexCache;
  }

  try {
    const response = await fetch(CHANGELOG_INDEX_URL);

    if (!response.ok) {
      console.warn(`Failed to load changelog index: ${response.status}`);
      return [];
    }

    const data = await response.json();
    indexCache = data;
    return data;
  } catch (error) {
    console.error("Error loading changelog index:", error);
    return [];
  }
}

// Function to load changelog data for a specific version
async function loadChangelogVersion(version: string): Promise<ChangelogEntry | null> {
  // Check cache first
  if (changelogCache.has(version)) {
    return changelogCache.get(version)!;
  }

  try {
    const response = await fetch(`${CHANGELOG_BASE_URL}/${version}.json`);

    if (!response.ok) {
      console.warn(`Failed to load changelog for version ${version}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    changelogCache.set(version, data);
    return data;
  } catch (error) {
    console.error(`Error loading changelog for version ${version}:`, error);
    return null;
  }
}

const ChangeWrapper = styled.div`
  display: flex;
  flex-flow: column;
  gap: 16px;
`;

type SectionType = "added" | "removed" | "changed";

const sectionColors: Record<SectionType, { bg: string; border: string; shadow: string }> = {
  added: { bg: "rgba(16, 185, 129, 0.05)", border: "#10b981", shadow: "rgba(16, 185, 129, 0.1)" },
  removed: { bg: "rgba(239, 68, 68, 0.05)", border: "#ef4444", shadow: "rgba(239, 68, 68, 0.1)" },
  changed: { bg: "rgba(245, 158, 11, 0.05)", border: "#f59e0b", shadow: "rgba(245, 158, 11, 0.1)" },
};

const sectionLabels: Record<SectionType, string> = { added: "Added", removed: "Removed", changed: "Changed" };

const ChangeSection = styled.div<{ type: SectionType }>`
  background-color: ${(props) => sectionColors[props.type].bg};
  border-left: 4px solid ${(props) => sectionColors[props.type].border};
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px ${(props) => sectionColors[props.type].shadow};
`;

const ChangeSectionTitle = styled.div<{ type: SectionType }>`
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
  color: ${(props) => sectionColors[props.type].border};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChangeCategory = styled.div`
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: ${(props) => props.theme.group};
  border-radius: 6px;
`;

const CategoryName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => props.theme.text};
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: "📁";
    font-size: 14px;
  }
`;

const ChangeList = styled.ul`
  margin: 0;
  padding-left: 20px;
  list-style-type: none;
`;

const ChangeItemStyled = styled.li`
  font-family: monospace;
  font-size: 13px;
  color: ${(props) => props.theme.text};
  margin-bottom: 4px;
  padding: 2px 0;
`;

const ChangeItemSignature = styled.span`
  color: ${(props) => props.theme.highlight};
  font-weight: 500;
`;

const ChangeItemClass = styled.span`
  color: #2563eb;
  font-weight: 600;
`;

const ChangeItemEnum = styled.span`
  color: #7c3aed;
  font-weight: 600;
`;

const ChangeSubCategory = styled.div<{ collapsed?: boolean }>`
  margin-bottom: 8px;
  padding: 6px 10px;
  background-color: ${(props) => props.theme.groupBorder}20;
  border-radius: 4px;
  border-left: 2px solid ${(props) => props.theme.highlight};
`;

const SubCategoryName = styled.div<{ collapsed?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${(props) => props.theme.textFaded};
  margin-bottom: 4px;
  text-transform: capitalize;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "${(props) => (props.collapsed ? "▶" : "▼")}";
    font-size: 10px;
    transition: transform 0.2s;
  }

  &:hover {
    color: ${(props) => props.theme.text};
  }
`;

const NoChanges = styled.div`
  color: ${(props) => props.theme.textFaded};
  font-style: italic;
  padding: 40px;
  text-align: center;
  background-color: ${(props) => props.theme.group};
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.groupBorder};
`;

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
`;

const VersionHeader = styled.div`
  margin-bottom: 16px;
  h2 {
    margin: 0 0 4px 0;
    font-size: 18px;
  }
  p {
    margin: 0;
    color: ${(props) => props.theme.textFaded};
    font-size: 13px;
  }
`;

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

const CommitLink = styled.a`
  color: inherit;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const DiffRow = styled.div`
  font-family: monospace;
  font-size: 12px;
  margin: 2px 0;
  padding: 2px 6px;
  border-radius: 3px;
`;

const DiffOld = styled(DiffRow)`
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
`;

const DiffNew = styled(DiffRow)`
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
`;

const DiffFieldLabel = styled.span`
  font-weight: 600;
  color: ${(props) => props.theme.textFaded};
  margin-right: 6px;
  font-size: 11px;
  text-transform: uppercase;
`;

const ChangedCount = styled.span`
  color: #f59e0b;
  margin-left: 4px;
`;

const EmptyIndex = styled.div`
  padding: 40px;
  text-align: center;
  color: ${(props) => props.theme.textFaded};

  h3 {
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    margin-bottom: 8px;
  }

  code {
    background: ${(props) => props.theme.group};
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 13px;
  }
`;

function getTypeDisplayName(type: string): string {
  // If it looks like a class name (starts with CDOTA_ or contains _), display as is
  if (type.startsWith("CDOTA_") || type.includes("_") || type === "Global Functions") {
    return type;
  }

  const typeMap: Record<string, string> = {
    class: "Classes",
    function: "Functions",
    method: "Methods",
    constant: "Constants",
    const: "Constants",
    modifier: "Modifiers",
    modifiers: "Modifiers",
    event: "Events",
    events: "Events",
    convar: "Convars",
    property: "Properties",
    enum: "Enums",
    enum_member: "Enum Members",
    member: "Members",
  };
  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1) + "s";
}

function formatChangeItem(item: ChangeItem): React.ReactNode {
  if (item.type === "member" && item.enum) {
    return (
      <>
        <ChangeItemEnum>{item.enum}</ChangeItemEnum>.{item.name}
        {item.value !== undefined && ` = ${item.value}`}
      </>
    );
  }
  if (item.type === "enum_member") {
    return <>{item.name}</>;
  }
  if (item.type === "enum") {
    return <ChangeItemEnum>{item.name}</ChangeItemEnum>;
  }
  if (item.type === "function" || item.type === "method") {
    return (
      <>
        <ChangeItemSignature>{item.signature || item.name}</ChangeItemSignature>
      </>
    );
  }
  if (item.type === "class") {
    return <ChangeItemClass>{item.name}</ChangeItemClass>;
  }
  if (item.type === "constant" || item.type === "const") {
    return <>{item.name}</>;
  }
  if (item.type === "modifier" || item.type === "modifiers") {
    return <>{item.name}</>;
  }
  if (item.type === "event" || item.type === "events" || item.type === "convar") {
    return <>{item.name}</>;
  }
  if (item.type === "property") {
    return (
      <>
        {item.name}
        {item.description && `: ${item.description}`}
      </>
    );
  }
  return <>{item.name || JSON.stringify(item)}</>;
}

const diffFieldLabels: Record<string, string> = {
  signature: "Signature",
  returns: "Returns",
  argsDetail: "Arguments",
  value: "Value",
  fieldsDetail: "Fields",
  description: "Description",
};

function formatChangedItem(item: ChangedItem): React.ReactNode {
  const itemName =
    item.type === "method" && item.class
      ? `${item.class}.${item.name}`
      : item.type === "enum_member" && item.enum
      ? `${item.enum}.${item.name}`
      : item.name || "unknown";

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{itemName}</div>
      {Object.entries(item.changes).map(([field, diff]) => (
        <div key={field} style={{ marginLeft: 12 }}>
          <DiffFieldLabel>{diffFieldLabels[field] || field}:</DiffFieldLabel>
          <DiffOld>- {diff.old || "(empty)"}</DiffOld>
          <DiffNew>+ {diff.new || "(empty)"}</DiffNew>
        </div>
      ))}
    </div>
  );
}

function getGroupKeyForItem(item: { type?: string; class?: string; enum?: string }): string {
  if (
    item.type === "function" ||
    item.type === "method" ||
    item.type === "constant" ||
    item.type === "const" ||
    item.type === "property"
  ) {
    return (
      item.class ||
      (item.type === "constant" || item.type === "const"
        ? "Global Constants"
        : item.type === "property"
        ? "Global Properties"
        : "Global Functions")
    );
  }
  if (item.type === "enum_member") {
    return item.enum || "Global Enum Members";
  }
  return item.type || "other";
}

function VersionContent({ entry }: { entry: ChangelogEntry }) {
  const categories = Object.entries(entry.changes);
  const hasChanges = categories.some(
    ([, cat]) => (cat.added?.length || 0) > 0 || (cat.removed?.length || 0) > 0 || (cat.changed?.length || 0) > 0,
  );

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleCollapsed = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Initialize collapsed state for modifier groups
  useEffect(() => {
    const modifierGroups = new Set<string>();
    categories.forEach(([catName, cat]) => {
      const items = [...(cat.added || []), ...(cat.removed || []), ...(cat.changed || [])];
      items.forEach((item) => {
        const groupKey = getGroupKeyForItem(item);
        if (getTypeDisplayName(groupKey) === "Modifiers") {
          modifierGroups.add(`${catName}-${groupKey}`);
        }
      });
    });
    setCollapsedGroups(modifierGroups);
  }, [entry]);

  if (!hasChanges) {
    return <NoChanges>No API changes detected in this version</NoChanges>;
  }

  const renderSection = (type: "added" | "removed") => {
    const categoryData = categories
      .map(([catName, cat]) => ({
        category: catName,
        items: type === "added" ? cat.added || [] : cat.removed || [],
      }))
      .filter((c) => c.items.length > 0);

    if (categoryData.length === 0) return null;

    return (
      <ChangeSection type={type}>
        <ChangeSectionTitle type={type}>{sectionLabels[type]}</ChangeSectionTitle>
        {categoryData.map(({ category, items }) => {
          const groupedItems = items.reduce((acc, item) => {
            const groupKey = getGroupKeyForItem(item);
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(item);
            return acc;
          }, {} as Record<string, ChangeItem[]>);

          return (
            <ChangeCategory key={category}>
              <CategoryName>
                {category} ({items.length})
              </CategoryName>
              {Object.entries(groupedItems).map(([subType, subItems]) => {
                const fullKey = `${type}-${category}-${subType}`;
                const isCollapsed = collapsedGroups.has(fullKey);
                return (
                  <ChangeSubCategory key={subType} collapsed={isCollapsed}>
                    <SubCategoryName collapsed={isCollapsed} onClick={() => toggleCollapsed(fullKey)}>
                      {getTypeDisplayName(subType)} ({subItems.length})
                    </SubCategoryName>
                    {!isCollapsed && (
                      <ChangeList>
                        {subItems.map((item, i) => (
                          <ChangeItemStyled key={i}>{formatChangeItem(item)}</ChangeItemStyled>
                        ))}
                      </ChangeList>
                    )}
                  </ChangeSubCategory>
                );
              })}
            </ChangeCategory>
          );
        })}
      </ChangeSection>
    );
  };

  const renderChangedSection = () => {
    const categoryData = categories
      .map(([catName, cat]) => ({
        category: catName,
        items: cat.changed || [],
      }))
      .filter((c) => c.items.length > 0);

    if (categoryData.length === 0) return null;

    return (
      <ChangeSection type="changed">
        <ChangeSectionTitle type="changed">Changed</ChangeSectionTitle>
        {categoryData.map(({ category, items }) => {
          const groupedItems = items.reduce((acc, item) => {
            const groupKey = getGroupKeyForItem(item);
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(item);
            return acc;
          }, {} as Record<string, ChangedItem[]>);

          return (
            <ChangeCategory key={category}>
              <CategoryName>
                {category} ({items.length})
              </CategoryName>
              {Object.entries(groupedItems).map(([subType, subItems]) => {
                const fullKey = `changed-${category}-${subType}`;
                const isCollapsed = collapsedGroups.has(fullKey);
                return (
                  <ChangeSubCategory key={subType} collapsed={isCollapsed}>
                    <SubCategoryName collapsed={isCollapsed} onClick={() => toggleCollapsed(fullKey)}>
                      {getTypeDisplayName(subType)} ({subItems.length})
                    </SubCategoryName>
                    {!isCollapsed && (
                      <ChangeList>
                        {subItems.map((item, i) => (
                          <ChangeItemStyled key={i}>{formatChangedItem(item)}</ChangeItemStyled>
                        ))}
                      </ChangeList>
                    )}
                  </ChangeSubCategory>
                );
              })}
            </ChangeCategory>
          );
        })}
      </ChangeSection>
    );
  };

  return (
    <ChangeWrapper>
      {renderChangedSection()}
      {renderSection("added")}
      {renderSection("removed")}
    </ChangeWrapper>
  );
}

export default function Changelog() {
  const { version: urlVersion } = useParams<{ version?: string }>();
  const history = useHistory();

  const [index, setIndex] = useState<IndexEntry[]>([]);
  const [indexLoading, setIndexLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "error">("idle");
  const [currentEntry, setCurrentEntry] = useState<ChangelogEntry | null>(null);

  // Load index on mount
  useEffect(() => {
    loadChangelogIndex().then((data) => {
      setIndex(data);
      setIndexLoading(false);
    });
  }, []);

  const selectedVersion = urlVersion || (index[0]?.version ?? "");

  // Load changelog data when version changes
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
    } catch (error) {
      console.error("Failed to load changelog:", error);
      setLoadingState("error");
    }
  }, []);

  useEffect(() => {
    if (selectedVersion) {
      loadVersion(selectedVersion);
    }
  }, [selectedVersion, loadVersion]);

  // Navigate to first version if none selected
  useEffect(() => {
    if (!urlVersion && index.length > 0) {
      history.replace(`/changelog/${index[0].version}`);
    }
  }, [urlVersion, index, history]);

  // Show loading state while fetching index
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

  // Show empty state if no changelog index
  if (index.length === 0) {
    return (
      <>
        <SidebarWrapper>
          <NoChanges>No versions available</NoChanges>
        </SidebarWrapper>
        <ContentWrapper>
          <EmptyIndex>
            <h3>No Changelog Data</h3>
            <p>Changelog data is loading or not available.</p>
            <p>If running locally, make sure the dev server is running and changelog files exist.</p>
          </EmptyIndex>
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
      return (
        <ErrorState>
          Failed to load changelog for version {selectedVersion}.
          <br />
          The changelog file may not exist yet for this version.
        </ErrorState>
      );
    }

    if (!currentEntry) {
      return <NoChanges>Select a version from the sidebar</NoChanges>;
    }

    return (
      <>
        <VersionHeader>
          <h2>Version {currentEntry.version}</h2>
          <p>
            {currentEntry.date}
            {currentEntry.time && ` at ${currentEntry.time}`}
            {currentEntry.commitSha && (
              <>
                {" • "}
                <CommitLink
                  href={`https://github.com/iwasinminedream/dota-data/commit/${currentEntry.commitSha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {currentEntry.commitSha.slice(0, 7)}
                </CommitLink>
              </>
            )}
          </p>
        </VersionHeader>
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
                    {entry.changedCount ? <ChangedCount>~{entry.changedCount}</ChangedCount> : null}
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
