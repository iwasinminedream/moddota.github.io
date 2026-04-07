import { darken } from "polished";
import React from "react";
import styled from "styled-components";
import ToggleButton from "react-toggle-button";
import { NavLink } from "react-router-dom";
import { AppContext } from "~components/AppContext";
import ModDotaLogo from "~components/ModDota.svg";

export const NavBar = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <NavBarWrapper>
      <NavBarTop>
        <HomeBrandLink href="/">
          <ModDotaLogo height="32" width="36" />
          <span>ModDota</span>
        </HomeBrandLink>
        <NavBarLinks>
          <NavBarLink to="/vscripts">Lua API</NavBarLink>
          <NavBarLink to="/events">Game Events</NavBarLink>
          <NavBarLink to="/panorama/api">Panorama API</NavBarLink>
          <NavBarLink to="/panorama/css">Panorama CSS</NavBarLink>
          <NavBarLink to="/panorama/events">Panorama Events</NavBarLink>
          <NavBarLink to="/abilities">Abilities</NavBarLink>
          <NavBarLink to="/modifiers">Modifiers</NavBarLink>
          <NavBarLink to="/convars">Convars</NavBarLink>
          <NavBarLink to="/changelog">Changelog</NavBarLink>
        </NavBarLinks>
        <NavBarRight>
          <NavBarThemeSwitcher />
          <BurgerButton onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? "✕" : "☰"}
          </BurgerButton>
        </NavBarRight>
      </NavBarTop>
      {menuOpen && (
        <MobileMenu onClick={() => setMenuOpen(false)}>
          <NavBarLink to="/vscripts">Lua API</NavBarLink>
          <NavBarLink to="/events">Game Events</NavBarLink>
          <NavBarLink to="/panorama/api">Panorama API</NavBarLink>
          <NavBarLink to="/panorama/css">Panorama CSS</NavBarLink>
          <NavBarLink to="/panorama/events">Panorama Events</NavBarLink>
          <NavBarLink to="/abilities">Abilities</NavBarLink>
          <NavBarLink to="/modifiers">Modifiers</NavBarLink>
          <NavBarLink to="/convars">Convars</NavBarLink>
          <NavBarLink to="/changelog">Changelog</NavBarLink>
        </MobileMenu>
      )}
    </NavBarWrapper>
  );
};

const HomeBrandLink = styled.a`
  display: flex;
  align-items: center;
  font-weight: bold;
  text-decoration: none;
  color: ${(props) => props.theme.text};
  text-shadow: 1px 1px 2px ${(props) => props.theme.navbarLinkShadow};
  padding: 0 20px;

  &.active {
    color: ${(props) => props.theme.highlight};
  }
  svg {
    margin-right: 8px;
  }

  @media (max-width: 500px) {
    span {
      display: none;
    }
  }
`;

const NavBarWrapper = styled.nav`
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.navbar};
  border-bottom: 1px solid ${(props) => props.theme.navbarShadow};
  box-shadow: 0 0 4px ${(props) => props.theme.navbarShadow};
  margin-bottom: 8px;
`;

const NavBarTop = styled.div`
  display: flex;
  align-items: center;
`;

const NavBarLinks = styled.div`
  display: flex;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavBarRight = styled.div`
  display: flex;
  flex: auto;
  justify-content: flex-end;
  align-items: center;
  padding-right: 12px;
`;

const BurgerButton = styled.button`
  display: none;
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  padding: 8px;
  color: ${(props) => props.theme.text};
  margin-left: 8px;

  @media (max-width: 768px) {
    display: block;
  }
`;

const MobileMenu = styled.div`
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  border-top: 1px solid ${(props) => props.theme.navbarShadow};

  @media (min-width: 769px) {
    display: none;
  }
`;

const NavBarLink = styled(NavLink)`
  padding: 12px 20px;
  font-weight: 600;
  text-decoration: none;

  color: ${(props) => darken(0.2, props.theme.text)};
  text-shadow: 1px 1px 2px ${(props) => props.theme.navbarLinkShadow};

  &.active {
    color: ${(props) => props.theme.highlight};
  }
`;

function NavBarThemeSwitcher() {
  const appContext = React.useContext(AppContext);

  return (
    <ToggleButton
      inactiveLabel="🌞"
      activeLabel="🌜"
      colors={{
        active: {
          base: "#101010",
        },
        inactive: {
          base: "#c0c0c0",
        },
        activeThumb: {
          base: "#606060",
        },
        inactiveThumb: {
          base: "#ffffff",
        },
      }}
      activeLabelStyle={{
        fontSize: "18px",
      }}
      inactiveLabelStyle={{
        fontSize: "18px",
      }}
      trackStyle={{
        height: "24px",
      }}
      thumbStyle={{
        width: "24px",
        height: "24px",
        borderWidth: "3px",
      }}
      passThroughInputProps={{
        "aria-label": "Dark Mode Toggle",
      }}
      value={appContext.darkmode}
      onToggle={(v) => appContext.setDarkmode(!v)}
    />
  );
}
