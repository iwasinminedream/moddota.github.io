import React from "react";
import { DeclarationsPage } from "../DeclarationsPage";
import { panoramaEventsScope } from "../../../data/panorama-events-data";

export function PanoramaEventsPage() {
  return <DeclarationsPage context={panoramaEventsScope} hoist={[]} />;
}
