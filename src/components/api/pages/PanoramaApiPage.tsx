import React from "react";
import { DeclarationsPage } from "../DeclarationsPage";
import { panoramaScope } from "../../../data/panorama-api-data";

export function PanoramaApiPage() {
  return <DeclarationsPage context={panoramaScope} hoist={[]} />;
}
