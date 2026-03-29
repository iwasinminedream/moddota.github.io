import React, { useMemo } from "react";
import styled from "styled-components";
import { lighten, darken } from "polished";
import { Link, useLocation } from "react-router-dom";
import modifiersData from "@moddota/dota-data/files/vscripts/modifier_list.json";
import { ContentWrapper, ListItem, StyledSearchBox, TextMessage } from "~components/layout/Content";
import { SidebarWrapper } from "~components/layout/Sidebar";
import { ScrollableList, LazyList } from "~components/Lists";
import { useRouterSearch } from "~components/Search";


const modifiers = modifiersData as Record<string, string[]>;

// Non-hero categories that go at the top
const specialCategories = ["neutral", "event", "items", "other", "special_bonus", "roshan", "rune"];

// Separate hero vs special categories, sort heroes alphabetically
const categories = Object.entries(modifiers)
  .map(([name, items]) => ({ name, count: items.length, isHero: !specialCategories.includes(name) }))
  .sort((a, b) => {
    if (a.isHero !== b.isHero) return a.isHero ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

// Create a flat list of all modifiers
const allModifiers = Object.entries(modifiers)
  .flatMap(([category, names]) => names.map((name) => ({ name, category })))
  .sort((a, b) => a.name.localeCompare(b.name));

// Helper to get hero icon URL
function getIconUrl(category: string): string | null {
  if (category === "other") return null;
  return `images/heroes/${category}.png`;
}

// Format display name for category
function formatCategoryName(name: string): string {
  return name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

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

  const currentPath = location.pathname + location.search;

  return (
    <>
      <SidebarWrapper>
        <SidebarLinkStyled to="/modifiers" $isActive={currentPath === "/modifiers"}>
          All
          <CountBadge>{allModifiers.length}</CountBadge>
        </SidebarLinkStyled>

        {categories.filter((c) => !c.isHero).map((cat, i, arr) => (
          <React.Fragment key={cat.name}>
            <SidebarLinkStyled
              to={`/modifiers?category=${cat.name}`}
              $isActive={currentPath === `/modifiers?category=${cat.name}`}
            >
              {getIconUrl(cat.name) && <HeroIcon src={getIconUrl(cat.name)!} alt="" />}
              {formatCategoryName(cat.name)}
              <CountBadge>{cat.count}</CountBadge>
            </SidebarLinkStyled>
            {i === arr.length - 1 && <SidebarDivider />}
          </React.Fragment>
        ))}

        {categories.filter((c) => c.isHero).map((cat) => (
          <SidebarLinkStyled
            key={cat.name}
            to={`/modifiers?category=${cat.name}`}
            $isActive={currentPath === `/modifiers?category=${cat.name}`}
          >
            <HeroIcon src={getIconUrl(cat.name)!} alt="" />
            {formatCategoryName(cat.name)}
            <CountBadge>{cat.count}</CountBadge>
          </SidebarLinkStyled>
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
