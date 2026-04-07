import React from "react";
import { DeclarationsPage } from "../DeclarationsPage";
import { eventsScope } from "../../../data/events-data";

export function EventsPage() {
  return <DeclarationsPage context={eventsScope} hoist={[]} />;
}
