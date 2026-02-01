import * as api from "./api";
import React from "react";
import styled from "styled-components";
import { ElementLink, KindIcon, useLinkedElement } from "./utils/components";
import {
  CommonGroupHeader,
  CommonGroupSignature,
  CommonGroupWrapper,
  ElementBadges,
  OptionalDescription,
} from "./utils/styles";

const CssPropertyWrapper = styled(CommonGroupWrapper)`
  padding: 2px 5px;
`;

const CssPropertySignature = styled(CommonGroupSignature)`
  margin-bottom: 3px;
`;

const ExamplesWrapper = styled.div`
  margin: 4px 0 0 28px;
  padding: 6px 0;
  border-top: 1px solid ${(props) => props.theme.groupSeparator};
  display: flex;
  flex-direction: column;
  gap: 4px;

  @media (max-width: 768px) {
    margin-left: 0;
    padding-left: 2px;
  }
`;

const ExampleItem = styled.code`
  display: block;
  font-size: 13px;
  color: ${(props) => props.theme.text};
  background-color: ${(props) => props.theme.groupMembers};
  padding: 4px 8px;
  border-radius: 3px;
  white-space: pre-wrap;
  word-break: break-all;
`;

export const CssProperty: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  element: api.CssProperty;
}> = ({ className, style, element }) => {
  const isLinked = useLinkedElement({ scope: "properties", hash: element.name });

  return (
    <CssPropertyWrapper className={className} style={style} id={element.name} isLinked={isLinked}>
      <CommonGroupHeader>
        <CssPropertySignature>
          <KindIcon kind="function" size="big" />
          {element.name}
        </CssPropertySignature>
        <ElementBadges>
          <ElementLink scope="properties" hash={element.name} />
        </ElementBadges>
      </CommonGroupHeader>
      <OptionalDescription description={element.description} />
      {element.examples.length > 0 && (
        <ExamplesWrapper>
          {element.examples.map((example, i) => (
            <ExampleItem key={i}>{example}</ExampleItem>
          ))}
        </ExamplesWrapper>
      )}
    </CssPropertyWrapper>
  );
};
