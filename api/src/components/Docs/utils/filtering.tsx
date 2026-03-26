import apiTypes from "@moddota/dota-data/files/vscripts/api-types";
import { getFuncDeepTypes } from "@moddota/dota-data/lib/helpers/vscripts";
import { useParams } from "react-router-dom";
import { composeFilters, useRouterSearch, AvailabilityFilters } from "~components/Search";
import { isNotNil } from "~utils/types";
import { fuzzyContains, fuzzyMatch } from "~utils/fuzzySearch";
import * as api from "~components/Docs/api";

// Helper function to filter class members by availability
function filterDeclarationsByAvailability(
  declarations: api.Declaration[],
  availabilityFilters?: AvailabilityFilters
): api.Declaration[] {
  if (!availabilityFilters) return declarations;
  
  const { serverEnabled, clientEnabled } = availabilityFilters;
  
  // If both filters are enabled, no filtering needed
  if (serverEnabled && clientEnabled) return declarations;
  
  return declarations.map((declaration) => {
    if (declaration.kind === "class") {
      return {
        ...declaration,
        members: declaration.members.filter((member) => {
          if (member.kind !== "function") return true;
          if (!member.available) return true;
          
          if (member.available === "server" && !serverEnabled) return false;
          if (member.available === "client" && !clientEnabled) return false;
          
          return true;
        }),
      };
    }
    return declaration;
  }).filter((d) => {
    // Don't filter out classes even if they have no members after filtering
    if (d.kind === "class") return true;
    return true;
  });
}

export function useFilteredData(
  declarations: api.Declaration[], 
  availabilityFilters?: AvailabilityFilters
) {
  const search = useRouterSearch();
  const { scope = "" } = useParams<{ scope?: string }>();

  if (search) {
    return { data: doSearch(declarations, search.toLowerCase().split(" "), availabilityFilters), isSearching: true };
  }

  switch (scope) {
    case "functions":
      declarations = declarations.filter((x) => x.kind === "function");
      break;
    case "constants":
      declarations = declarations.filter((x) => x.kind === "constant");
      break;
    case "properties":
      declarations = declarations.filter((x) => x.kind === "cssProperty");
      break;
    default:
      declarations = declarations.filter((x) => x.name === scope);
  }

  // Apply availability filters to class members even when not searching
  declarations = filterDeclarationsByAvailability(declarations, availabilityFilters);

  return { data: declarations, isSearching: false };
}

const overrideReferences: Partial<Record<string, string[]>> = {
  TraceCollideable: ["TraceCollideableOutputs"],
  TraceHull: ["TraceHullOutputs"],
  TraceLine: ["TraceLineOutputs"],
};

export function getReferencesForFunction(func: api.FunctionDeclaration) {
  const allReferences = new Set<apiTypes.Object>();

  function addReference(name: string) {
    const reference = apiTypes.find((t) => t.name === name);
    if (!reference || reference.kind !== "object") return;

    allReferences.add(reference);
    for (const extendedType of reference.extend ?? []) {
      addReference(extendedType);
    }
  }

  (overrideReferences[func.name] ?? getFuncDeepTypes(func)).forEach(addReference);

  return [...allReferences];
}

const AVAILABILITY_PATTERN = /^-?on:(client|server)$/;
const ABSTRACT_METHOD_PATTERN = /^-?is:abstract$/;

export function doSearch(
  declarations: api.Declaration[], 
  words: string[],
  availabilityFilters?: AvailabilityFilters
): api.Declaration[] {
  const availabilityWords = words.filter((x) => AVAILABILITY_PATTERN.test(x));
  const abstractMethodWords = words.filter((x) => ABSTRACT_METHOD_PATTERN.test(x));
  const typeWords = words.filter((x) => x.startsWith("type:")).map((x) => x.replace(/^type:/, ""));
  const nameWords = words.filter(
    (x) => !x.startsWith("type:") && !AVAILABILITY_PATTERN.test(x) && !ABSTRACT_METHOD_PATTERN.test(x),
  );

  function filterAvailability(member: { available: api.Availability } | object) {
    // First check the UI filters (from buttons)
    if (availabilityFilters) {
      const { serverEnabled, clientEnabled } = availabilityFilters;
      
      // If both are enabled, no filtering needed from UI, continue to search query filters
      if (!serverEnabled || !clientEnabled) {
        if (!("available" in member)) {
          // Items without availability info - show them
          return undefined;
        }
        
        if (member.available === "server" && !serverEnabled) {
          return false;
        }
        
        if (member.available === "client" && !clientEnabled) {
          return false;
        }
        
        // "both" availability - always show (since we can't disable both filters)
      }
    }
    
    // Then check search query filters (for backward compatibility)
    if (availabilityWords.length === 0) return undefined;
    if (!("available" in member)) return false;

    if (member.available === "server") {
      return availabilityWords.includes("on:server");
    }

    if (member.available === "client") {
      return availabilityWords.includes("on:client");
    }

    return !availabilityWords.includes("-on:server") && !availabilityWords.includes("-on:client");
  }

  function filterAbstractMethod(member: api.ClassMember) {
    if (abstractMethodWords.length === 0) return undefined;

    const isAbstract = member.kind === "function" && member.abstract === true;
    return abstractMethodWords.includes("-is:abstract") ? !isAbstract : isAbstract;
  }

  function filterMemberType(member: api.ClassMember) {
    if (typeWords.length === 0) return undefined;

    const types = (member.kind === "function" ? getFuncDeepTypes(member) : member.types).map((type) =>
      type.toLowerCase(),
    );
    return typeWords.every((type) => types.some((x) => x.includes(type)));
  }

  function filterDeclarationType(declaration: api.Declaration) {
    if (typeWords.length === 0) return undefined;

    return (
      declaration.kind === "class" &&
      declaration.extend !== undefined &&
      typeWords.includes(declaration.extend.toLowerCase())
    );
  }

  function filterName(member: { name: string }) {
    if (nameWords.length === 0) return undefined;

    const name = member.name.toLowerCase();
    return nameWords.every((word) => fuzzyContains(name, word));
  }

  return declarations
    .map((declaration) => {
      const partialDeclaration: api.Declaration | undefined =
        declaration.kind === "class"
          ? {
              ...declaration,
              members: declaration.members.filter(
                composeFilters([filterName, filterAbstractMethod, filterAvailability, filterMemberType]),
              ),
            }
          : declaration.kind === "enum"
          ? {
              ...declaration,
              members: declaration.members.filter(composeFilters([filterName, filterAvailability])),
            }
          : undefined;

      if (partialDeclaration && partialDeclaration.members.length > 0) {
        // Calculate relevance score: best matching member score
        const bestMemberScore = nameWords.length > 0
          ? Math.min(
              ...partialDeclaration.members.map((m) => {
                const scores = nameWords.map((w) => fuzzyMatch(m.name, w));
                return scores.every((s) => s >= 0) ? scores.reduce((a, b) => a + b, 0) : Infinity;
              })
            )
          : 0;
        return { declaration: partialDeclaration, score: bestMemberScore };
      }

      if (composeFilters([filterName, filterAvailability, filterDeclarationType])(declaration)) {
        const element = { ...declaration };
        if (element.kind === "class" || element.kind === "enum") element.members = [];
        const declScore = nameWords.length > 0
          ? nameWords.reduce((sum, w) => sum + Math.max(0, fuzzyMatch(element.name, w)), 0)
          : 0;
        return { declaration: element, score: declScore };
      }
    })
    .filter(isNotNil)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.declaration);
}
