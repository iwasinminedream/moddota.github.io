import { darken } from "polished";
import React, { useContext } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { IconKind, KindIcon } from "~components/KindIcon";
import { Declaration } from "~components/Docs/api";
import { DeclarationsContext } from "~components/Docs/DeclarationsContext";
import { Star } from "../Docs/Star";

const SidebarLink = styled(NavLink)`
  background: ${(props) => props.theme.sidebar};
  border-bottom: 3px solid transparent;
  border-radius: 3px;
  padding: 2px 2px 0 2px;
  text-decoration: none;
  color: ${(props) => props.theme.text};
  word-break: break-all;

  :not(:last-child) {
    margin-bottom: 3px;
  }

  &:hover {
    background: ${(props) => darken(0.09, props.theme.sidebar)};
  }

  &.active {
    font-weight: 600;
    background: ${(props) => darken(0.09, props.theme.sidebar)};
    border-bottom: 3px solid ${(props) => props.theme.highlight};
  }
`;

const SidebarLinkManual = styled(Link)<{ $isActive?: boolean }>`
  background: ${(props) => props.$isActive ? darken(0.09, props.theme.sidebar) : props.theme.sidebar};
  border-bottom: 3px solid ${(props) => props.$isActive ? props.theme.highlight : "transparent"};
  border-radius: 3px;
  padding: 2px 2px 0 2px;
  text-decoration: none;
  color: ${(props) => props.theme.text};
  word-break: break-all;
  font-weight: ${(props) => props.$isActive ? 600 : "normal"};

  :not(:last-child) {
    margin-bottom: 3px;
  }

  &:hover {
    background: ${(props) => darken(0.09, props.theme.sidebar)};
  }
`;

const SidebarKindIcon = styled(KindIcon)`
  vertical-align: ${({ kind }) => (kind === "interface" ? "middle" : "baseline")};
`;

const SidebarElementStar = styled(Star)`
  float: right;
`;

export const SidebarElement: React.FC<{
  to: string;
  icon: IconKind;
  text: string;
  extra?: React.ReactNode;
}> = React.memo(({ to, icon, text, extra }) => (
  <SidebarLink to={to}>
    <SidebarKindIcon kind={icon} size="small" /> {text}
    {extra}
  </SidebarLink>
));

// SidebarItem with manual active state detection (for query params)
export const SidebarItem: React.FC<{
  to: string;
  icon: IconKind;
  text: React.ReactNode;
  isActive?: boolean;
}> = React.memo(({ to, icon, text, isActive }) => {
  const location = useLocation();
  const currentPath = location.pathname + location.search;
  const active = isActive !== undefined ? isActive : currentPath === to;
  
  return (
    <SidebarLinkManual to={to} $isActive={active}>
      <SidebarKindIcon kind={icon} size="small" /> {text}
    </SidebarLinkManual>
  );
});

export const DeclarationSidebarElement: React.FC<{ declaration: Declaration }> = React.memo(({ declaration }) => {
  const { root } = useContext(DeclarationsContext);
  return (
    <SidebarElement
      to={`${root}/${declaration.name}`}
      icon={declaration.kind}
      text={declaration.name}
      extra={declaration.isStarred && <SidebarElementStar />}
    />
  );
});

export const SidebarWrapper = styled.div`
  width: 340px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-flow: column;
  overflow-y: scroll;
  padding: 2px 12px;

  @media (max-width: 1100px) {
    width: 200px;
  }

  @media (max-width: 768px) {
    width: 100%;
    max-height: 40vh;
    border-bottom: 1px solid ${(props) => props.theme.groupBorder};
  }
`;
