import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { lighten } from "polished";
import { useLocation, useHistory } from "react-router-dom";
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

interface CategoryChanges {
  added: ChangeItem[];
  removed: ChangeItem[];
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
}

// Cache for loaded changelog entries
const changelogCache = new Map<string, ChangelogEntry>();

// Check if running in development mode (localhost)
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// URLs for changelog files - local in dev, GitHub in production
const CHANGELOG_BASE_URL = isDev
  ? "/changelog-data/changelogs"
  : "https://raw.githubusercontent.com/iwasinminedream/dota-data/main/files/changelogs";

const CHANGELOG_INDEX_URL = isDev
  ? "/changelog-data/changelog-index.json"
  : "https://raw.githubusercontent.com/iwasinminedream/dota-data/main/files/changelog-index.json";

// Cache for the index
let indexCache: IndexEntry[] | null = null;

// Clear cache function for hot reload in dev mode
function clearChangelogCache() {
  indexCache = null;
  changelogCache.clear();
}

// In dev mode, clear cache periodically to pick up changes
if (isDev && typeof window !== 'undefined') {
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
  background-color: ${(props) => props.theme.group};
  border: 1px solid ${(props) => props.theme.groupBorder};
  border-top-color: ${(props) => lighten(0.1, props.theme.groupBorder)};
  border-radius: 4px;
  box-shadow: 2px 2px 6px ${(props) => props.theme.groupShadow};
  padding: 10px 12px;
`;

const ChangeSection = styled.div`
  margin-bottom: 12px;
  &:last-child { margin-bottom: 0; }
`;

const ChangeSectionTitle = styled.div<{ type: "added" | "removed" }>`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${(props) => (props.type === "added" ? "#10b981" : "#ef4444")};
`;

const ChangeCategory = styled.div`
  margin-bottom: 10px;
  padding-left: 12px;
`;

const CategoryName = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${(props) => props.theme.text};
  margin-bottom: 4px;
`;

const ChangeList = styled.ul`
  margin: 0;
  padding-left: 20px;
`;

const ChangeItemStyled = styled.li`
  font-family: monospace;
  font-size: 12px;
  color: ${(props) => props.theme.textFaded};
  margin-bottom: 2px;
`;

const ChangeItemSignature = styled.span`
  color: ${(props) => props.theme.highlight};
`;

const ChangeItemClass = styled.span`
  color: #3b82f6;
  font-weight: 500;
`;

const ChangeItemEnum = styled.span`
  color: #8b5cf6;
  font-weight: 500;
`;

const NoChanges = styled.div`
  color: ${(props) => props.theme.textFaded};
  font-style: italic;
  padding: 20px;
  text-align: center;
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
    to { transform: rotate(360deg); }
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
    // Format: "EnumName.MEMBER_NAME"
    const parts = item.name?.split('.') || [];
    if (parts.length === 2) {
      return (
        <>
          <ChangeItemEnum>{parts[0]}</ChangeItemEnum>.{parts[1]}
        </>
      );
    }
    return <>{item.name}</>;
  }
  if (item.type === "enum") {
    return <ChangeItemEnum>{item.name}</ChangeItemEnum>;
  }
  if (item.type === "function" || item.type === "method") {
    return (
      <>
        {item.class && <><ChangeItemClass>{item.class}</ChangeItemClass>.</>}
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
        <ChangeItemClass>{item.class}</ChangeItemClass>.{item.name}
        {item.description && `: ${item.description}`}
      </>
    );
  }
  return <>{item.name || JSON.stringify(item)}</>;
}

function VersionContent({ entry }: { entry: ChangelogEntry }) {
  const categories = Object.entries(entry.changes);
  const hasChanges = categories.some(
    ([, cat]) => (cat.added?.length || 0) > 0 || (cat.removed?.length || 0) > 0
  );

  if (!hasChanges) {
    return <NoChanges>No API changes detected in this version</NoChanges>;
  }

  const renderSection = (type: "added" | "removed") => {
    const items = categories
      .map(([catName, cat]) => ({
        category: catName,
        items: type === "added" ? (cat.added || []) : (cat.removed || []),
      }))
      .filter((c) => c.items.length > 0);

    if (items.length === 0) return null;

    return (
      <ChangeSection>
        <ChangeSectionTitle type={type}>
          {type === "added" ? "➕ Added" : "➖ Removed"}
        </ChangeSectionTitle>
        {items.map(({ category, items }) => (
          <ChangeCategory key={category}>
            <CategoryName>{category} ({items.length})</CategoryName>
            <ChangeList>
              {items.map((item, i) => (
                <ChangeItemStyled key={i}>{formatChangeItem(item)}</ChangeItemStyled>
              ))}
            </ChangeList>
          </ChangeCategory>
        ))}
      </ChangeSection>
    );
  };

  return (
    <ChangeWrapper>
      {renderSection("added")}
      {renderSection("removed")}
    </ChangeWrapper>
  );
}

export default function Changelog() {
  const location = useLocation();
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
  
  const selectedVersion = location.hash.slice(1) || (index[0]?.version ?? "");

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
    if (!location.hash && index.length > 0) {
      history.replace(`/changelog#${index[0].version}`);
    }
  }, [location.hash, index, history]);

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
            to={`/changelog#${entry.version}`}
            icon="constant"
            text={
              <>
                v{entry.version} - {entry.date}
                {(entry.addedCount !== undefined || entry.removedCount !== undefined) && (
                  <SidebarChangeCounts>
                    {entry.addedCount ? <AddedCount>+{entry.addedCount}</AddedCount> : null}
                    {entry.removedCount ? <RemovedCount>-{entry.removedCount}</RemovedCount> : null}
                  </SidebarChangeCounts>
                )}
              </>
            }
            isActive={entry.version === selectedVersion}
          />
        ))}
      </SidebarWrapper>
      <ContentWrapper>
        {renderContent()}
      </ContentWrapper>
    </>
  );
}
