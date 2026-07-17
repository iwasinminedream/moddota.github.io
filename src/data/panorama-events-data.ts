import panoramaEvents from "@moddota/dota-data/files/panorama/events";
import type { DeclarationsContextType } from "../components/api/Docs/DeclarationsContext";

export const panoramaEventsScope: DeclarationsContextType = {
  root: "/panorama/events",
  declarations: Object.entries(panoramaEvents)
    .map(([name, event]) => ({
      kind: "function" as const,
      name: name,
      description: event.description,
      isStarred: false,
      args: event.args.map((arg, index) => ({
        name: arg.name ?? `arg${index + 1}`,
        types: [arg.type],
      })),
      returns: ["void"],
      example: event.example,
      exampleSource: event.exampleSource,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
};
