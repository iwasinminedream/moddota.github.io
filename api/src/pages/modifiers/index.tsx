import React, { useMemo } from "react";
import styled from "styled-components";
import { lighten } from "polished";
import { useLocation } from "react-router-dom";
import modifiersData from "@moddota/dota-data/files/vscripts/modifier_list.json";
import { ContentWrapper, ListItem, StyledSearchBox, TextMessage } from "~components/layout/Content";
import { SidebarWrapper, SidebarItem } from "~components/layout/Sidebar";
import { ScrollableList, LazyList } from "~components/Lists";
import { useRouterSearch } from "~components/Search";

const modifiers = modifiersData as Record<string, string[]>;

// Create category list with counts
const categories = Object.entries(modifiers)
  .map(([name, items]) => ({ name, count: items.length }))
  .sort((a, b) => b.count - a.count);

// Create a flat list of all modifiers
const allModifiers = Object.entries(modifiers)
  .flatMap(([category, names]) => names.map((name) => ({ name, category })))
  .sort((a, b) => a.name.localeCompare(b.name));

const ModifierWrapper = styled.div`
  display: flex;
  flex-flow: column;
  background-color: ${(props) => props.theme.group};
  border: 1px solid ${(props) => props.theme.groupBorder};
  border-top-color: ${(props) => lighten(0.1, props.theme.groupBorder)};
  border-radius: 4px;
  box-shadow: 2px 2px 6px ${(props) => props.theme.groupShadow};
  padding: 6px 10px;
`;

const ModifierName = styled.code`
  font-size: 14px;
  font-weight: 600;
`;

function renderItem(modifier: { name: string; category: string }, style?: React.CSSProperties) {
  return (
    <ListItem style={style} key={`${modifier.category}-${modifier.name}`}>
      <ModifierWrapper>
        <ModifierName>{modifier.name}</ModifierName>
      </ModifierWrapper>
    </ListItem>
  );
}

export default function ModifiersPage() {
  const searchQuery = useRouterSearch();
  const location = useLocation();
  const selectedCategory = new URLSearchParams(location.search).get("category");

  const filteredModifiers = useMemo(() => {
    let filtered = allModifiers;

    if (selectedCategory) {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const isSearching = !!searchQuery || !!selectedCategory;

  return (
    <>
      <SidebarWrapper>
        <SidebarItem
          to="/modifiers"
          icon="constant"
          text={`All (${allModifiers.length})`}
        />
        {categories.map((cat) => (
          <SidebarItem
            key={cat.name}
            to={`/modifiers?category=${cat.name}`}
            icon="constant"
            text={`${cat.name} (${cat.count})`}
          />
        ))}
      </SidebarWrapper>

      <ContentWrapper>
        <StyledSearchBox baseUrl="/modifiers" />

        {filteredModifiers.length > 0 ? (
          isSearching ? (
            <LazyList data={filteredModifiers} render={renderItem} />
          ) : (
            <ScrollableList data={filteredModifiers} render={renderItem} />
          )
        ) : (
          <TextMessage>No modifiers found</TextMessage>
        )}
      </ContentWrapper>
    </>
  );
}
