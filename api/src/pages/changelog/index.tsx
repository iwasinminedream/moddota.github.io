import React from "react";
import styled from "styled-components";
import { lighten } from "polished";
import { useLocation } from "react-router-dom";
import changelogData from "@moddota/dota-data/files/changelog.json";
import { ContentWrapper, ListItem, TextMessage } from "~components/layout/Content";
import { SidebarWrapper, SidebarItem } from "~components/layout/Sidebar";
import { ScrollableList } from "~components/Lists";

interface VersionInfo {
  clientVersion: string;
  date: string;
  time: string;
  timestamp: string;
}

interface StateInfo {
  type: string;
  name: string;
  items: string[];
  details?: unknown;
}

interface Changes {
  added: Record<string, string[]>;
  removed: Record<string, string[]>;
  modified: Record<string, string[]>;
}

interface Changelog {
  versions: VersionInfo[];
  states: Record<string, Record<string, StateInfo>>;
  changes: Record<string, Changes>;
}

const changelog = changelogData as unknown as Changelog;

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
  
  &:last-child {
    margin-bottom: 0;
  }
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

const ChangeItem = styled.li`
  font-family: monospace;
  font-size: 12px;
  color: ${(props) => props.theme.textFaded};
`;

const NoChanges = styled.div`
  font-size: 14px;
  color: ${(props) => props.theme.textFaded};
  font-style: italic;
`;

const VersionHeader = styled.div`
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${(props) => props.theme.groupSeparator};
`;

const VersionTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${(props) => props.theme.highlight};
`;

const VersionMeta = styled.div`
  font-size: 12px;
  color: ${(props) => props.theme.textFaded};
  margin-top: 4px;
`;

function getChangeCounts(changes: Changes) {
  const added = Object.values(changes.added || {}).reduce((sum, arr) => sum + arr.length, 0);
  const removed = Object.values(changes.removed || {}).reduce((sum, arr) => sum + arr.length, 0);
  return { added, removed };
}

function VersionContent({ version, changes }: { version: VersionInfo | undefined; changes: Changes }) {
  const { added, removed } = getChangeCounts(changes);
  const hasChanges = added > 0 || removed > 0;

  return (
    <>
      {version && (
        <VersionHeader>
          <VersionTitle>Version {version.clientVersion}</VersionTitle>
          <VersionMeta>{version.date} at {version.time}</VersionMeta>
        </VersionHeader>
      )}
      {!hasChanges && <NoChanges>No changes detected in this version</NoChanges>}
      {Object.keys(changes.added || {}).length > 0 && (
        <ChangeSection>
          <ChangeSectionTitle type="added">+ Added ({added})</ChangeSectionTitle>
          {Object.entries(changes.added).map(([category, items]) => (
            <ChangeCategory key={category}>
              <CategoryName>{category} ({items.length})</CategoryName>
              <ChangeList>
                {items.slice(0, 15).map((item, i) => (
                  <ChangeItem key={i}>{item}</ChangeItem>
                ))}
                {items.length > 15 && <ChangeItem>... +{items.length - 15} more</ChangeItem>}
              </ChangeList>
            </ChangeCategory>
          ))}
        </ChangeSection>
      )}

      {Object.keys(changes.removed || {}).length > 0 && (
        <ChangeSection>
          <ChangeSectionTitle type="removed">− Removed ({removed})</ChangeSectionTitle>
          {Object.entries(changes.removed).map(([category, items]) => (
            <ChangeCategory key={category}>
              <CategoryName>{category} ({items.length})</CategoryName>
              <ChangeList>
                {items.slice(0, 15).map((item, i) => (
                  <ChangeItem key={i}>{item}</ChangeItem>
                ))}
                {items.length > 15 && <ChangeItem>... +{items.length - 15} more</ChangeItem>}
              </ChangeList>
            </ChangeCategory>
          ))}
        </ChangeSection>
      )}
    </>
  );
}

export default function ChangelogPage() {
  const location = useLocation();
  const defaultVersion = changelog.versions[0]?.clientVersion || "";
  const selectedVersion = new URLSearchParams(location.search).get("v") || defaultVersion;

  const currentChanges = changelog.changes[selectedVersion] || { added: {}, removed: {}, modified: {} };
  const currentVersion = changelog.versions.find((v) => v.clientVersion === selectedVersion);

  const renderContent = (_: unknown, style?: React.CSSProperties) => (
    <ListItem style={style} key="content">
      <ChangeWrapper>
        <VersionContent version={currentVersion} changes={currentChanges} />
      </ChangeWrapper>
    </ListItem>
  );

  return (
    <>
      <SidebarWrapper>
        {changelog.versions.map((version) => {
          const changes = changelog.changes[version.clientVersion] || { added: {}, removed: {}, modified: {} };
          const { added, removed } = getChangeCounts(changes);
          const label = added > 0 || removed > 0 
            ? `${version.clientVersion} (+${added}/-${removed})`
            : `${version.clientVersion}`;
          
          return (
            <SidebarItem
              key={version.clientVersion}
              to={`/changelog?v=${version.clientVersion}`}
              icon="enum"
              text={label}
            />
          );
        })}
      </SidebarWrapper>

      <ContentWrapper>
        {changelog.versions.length > 0 ? (
          <ScrollableList data={[currentChanges]} render={renderContent} />
        ) : (
          <TextMessage>No changelog data available</TextMessage>
        )}
      </ContentWrapper>
    </>
  );
}