import * as api from "./api";
import React, { useMemo, useContext } from "react";
import styled from "styled-components";
import { getReferencesForFunction } from "./utils/filtering";
import { ObjectType } from "./ObjectType";
import { ElementLink, KindIcon, SearchOnGitHub, SearchOnGoogle, useLinkedElement } from "./utils/components";
import {
  CommonGroupHeader,
  CommonGroupSignature,
  CommonGroupWrapper,
  ElementBadges,
  OptionalDescription,
} from "./utils/styles";
import { FunctionParameters, Types } from "./types";
import { AvailabilityBadge } from "~components/Docs/AvailabilityBadge";
import { DeclarationsContext } from "~components/Docs/DeclarationsContext";

const FunctionWrapper = styled(CommonGroupWrapper)`
  padding: 2px 5px;
`;

const FunctionSignature = styled(CommonGroupSignature)`
  margin-bottom: 3px;
`;

const ObjectReferences = styled.div`
  margin: 8px 25px 0 25px;
  margin-bottom: 7px;

  > :not(:last-child) {
    margin-bottom: 7px;
    box-sizing: border-box;
  }
`;

const ParameterDescription = styled.li`
  list-style: none;
  margin-left: 20px;
  margin-bottom: 6px;
  padding: 2px;
  font-size: 13px;
`;

const ParameterDescriptionName = styled.span`
  font-weight: 600;
`;

export const FunctionDeclaration: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  context?: string;
  declaration: api.ClassMethod;
}> = ({ className, style, context, declaration }) => {
  const { root } = useContext(DeclarationsContext);
  const isPanorama = root.includes("/panorama");
  const searchPath = isPanorama ? "panorama" : "vscripts";
  
  const objectReferences = useMemo(
    () => getReferencesForFunction(declaration).map((x) => <ObjectType key={x.name} declaration={x} />),
    [declaration],
  );

  const parameterDescriptions = useMemo(
    () =>
      declaration.args
        .filter((arg) => arg.description)
        .map((arg) => (
          <ParameterDescription key={arg.name}>
            <ParameterDescriptionName>{arg.name}</ParameterDescriptionName>: {arg.description}
          </ParameterDescription>
        )),
    [declaration],
  );

  const isLinked = useLinkedElement({ scope: context, hash: declaration.name });

  return (
    <FunctionWrapper className={className} style={style} id={declaration.name} isLinked={isLinked}>
      <CommonGroupHeader>
        <FunctionSignature>
          <KindIcon kind="function" size="big" />
          {declaration.name}
          {declaration.abstract && (
            <span title="Abstract: this method does not exist on the class, but it can be implemented on subclass">
              ?
            </span>
          )}
          <FunctionParameters args={declaration.args} />
          :&nbsp;
          {<Types types={declaration.returns} />}
        </FunctionSignature>
        <ElementBadges>
          {declaration.available && <AvailabilityBadge available={declaration.available} />}
          <SearchOnGitHub name={declaration.name} className={isPanorama ? context : undefined} searchPath={searchPath} />
          <SearchOnGoogle name={declaration.name} searchPath={searchPath} />
          {context && <ElementLink scope={context} hash={declaration.name} />}
        </ElementBadges>
      </CommonGroupHeader>
      {objectReferences.length > 0 && <ObjectReferences>{objectReferences}</ObjectReferences>}
      <OptionalDescription
        description={
          (declaration.description || parameterDescriptions.length > 0) && (
            <>
              {parameterDescriptions}
              {declaration.description}
            </>
          )
        }
      />
    </FunctionWrapper>
  );
};
