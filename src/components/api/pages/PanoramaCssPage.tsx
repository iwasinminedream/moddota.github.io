import React from "react";
import { DeclarationsPage } from "../DeclarationsPage";
import { panoramaCssScope } from "../../../data/panorama-css-data";

export function PanoramaCssPage() {
  return <DeclarationsPage context={panoramaCssScope} hoist={[]} />;
}
