import React, { useMemo } from "react";
import styled from "styled-components";
import { lighten } from "polished";
import { useLocation } from "react-router-dom";
import convarsData from "@moddota/dota-data/files/convars.json";
import { ContentWrapper, ListItem, StyledSearchBox, TextMessage } from "~components/layout/Content";
import { SidebarWrapper, SidebarItem } from "~components/layout/Sidebar";
import { ScrollableList, LazyList } from "~components/Lists";
import { useRouterSearch } from "~components/Search";

type ConvarData = {
  default: string;
  flags: string[];
  description: string;
};

const convars = convarsData as Record<string, ConvarData>;

// Flag filters for sidebar
const flagFilters = [
  { key: "all", label: "All" },
  { key: "sv", label: "Server (sv)" },
  { key: "cl", label: "Client (cl)" },
  { key: "cheat", label: "Cheat" },
  { key: "rep", label: "Replicated" },
  { key: "release", label: "Release" },
  { key: "a", label: "Archive (a)" },
  { key: "cmd", label: "Commands" },
];

// Create flat sorted list
const allConvars = Object.entries(convars)
  .map(([name, data]) => ({
    name,
    default: data.default,
    flags: data.flags,
    description: data.description,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Count convars per flag
const flagCounts = flagFilters.map((f) => ({
  ...f,
  count: f.key === "all"
    ? allConvars.length
    : f.key === "cmd"
    ? allConvars.filter((c) => c.default === "cmd").length
    : allConvars.filter((c) => c.flags.includes(f.key)).length,
}));

const ConvarWrapper = styled.div`
  display: flex;
  flex-flow: column;
  background-color: ${(props) => props.theme.group};
  border: 1px solid ${(props) => props.theme.groupBorder};
  border-top-color: ${(props) => lighten(0.1, props.theme.groupBorder)};
  border-radius: 4px;
  box-shadow: 2px 2px 6px ${(props) => props.theme.groupShadow};
  padding: 6px 10px;
`;

const ConvarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const ConvarName = styled.code`
  font-weight: 600;
  color: ${(props) => props.theme.highlight};
`;

const ConvarValue = styled.code`
  font-size: 12px;
  color: ${(props) => props.theme.textFaded};
`;

const flagColors: Record<string, { bg: string; color: string }> = {
  sv: { bg: "#1e3a5f", color: "#60a5fa" },
  cl: { bg: "#3f1e5f", color: "#c084fc" },
  cheat: { bg: "#5f1e1e", color: "#f87171" },
  rep: { bg: "#1e5f3a", color: "#4ade80" },
  release: { bg: "#5f5f1e", color: "#facc15" },
  a: { bg: "#4a3f2f", color: "#d4a574" },
};

const Flag = styled.span<{ flagType: string }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  background-color: ${(props) => flagColors[props.flagType]?.bg || props.theme.sidebar};
  color: ${(props) => flagColors[props.flagType]?.color || props.theme.textFaded};
  font-weight: 500;
`;

const ConvarDescription = styled.div`
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid ${(props) => props.theme.groupSeparator};
  font-size: 13px;
  color: ${(props) => props.theme.text};
`;

type ConvarEntry = {
  name: string;
  default: string;
  flags: string[];
  description: string;
};

function renderItem(convar: ConvarEntry, style?: React.CSSProperties) {
  return (
    <ListItem style={style} key={convar.name}>
      <ConvarWrapper>
        <ConvarHeader>
          <ConvarName>{convar.name}</ConvarName>
          {convar.default !== "cmd" && <ConvarValue>= {convar.default}</ConvarValue>}
          {convar.flags.map((flag) => (
            <Flag key={flag} flagType={flag}>{flag}</Flag>
          ))}
        </ConvarHeader>
        {convar.description && <ConvarDescription>{convar.description}</ConvarDescription>}
      </ConvarWrapper>
    </ListItem>
  );
}

export default function ConvarsPage() {
  const searchQuery = useRouterSearch();
  const location = useLocation();
  const selectedFlag = new URLSearchParams(location.search).get("flag") || "all";

  const filteredConvars = useMemo(() => {
    let filtered = allConvars;

    if (selectedFlag !== "all") {
      if (selectedFlag === "cmd") {
        filtered = filtered.filter((c) => c.default === "cmd");
      } else {
        filtered = filtered.filter((c) => c.flags.includes(selectedFlag));
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [selectedFlag, searchQuery]);

  const isSearching = !!searchQuery || selectedFlag !== "all";

  return (
    <>
      <SidebarWrapper>
        {flagCounts.map((flag) => (
          <SidebarItem
            key={flag.key}
            to={`/convars${flag.key === "all" ? "" : `?flag=${flag.key}`}`}
            icon="constant"
            text={`${flag.label} (${flag.count})`}
          />
        ))}
      </SidebarWrapper>

      <ContentWrapper>
        <StyledSearchBox baseUrl="/convars" />

        {filteredConvars.length > 0 ? (
          isSearching ? (
            <LazyList data={filteredConvars} render={renderItem} />
          ) : (
            <ScrollableList data={filteredConvars} render={renderItem} />
          )
        ) : (
          <TextMessage>No convars found</TextMessage>
        )}
      </ContentWrapper>
    </>
  );
}
