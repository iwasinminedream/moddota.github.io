import React from "react";
import { DeclarationsPage } from "../DeclarationsPage";
import { panoramaPanelsScope } from "../../../data/panorama-panels-data";

export function PanoramaPanelsPage() {
  return <DeclarationsPage context={panoramaPanelsScope} hoist={[]} />;
}
