import React from "react";
import { scopes } from "../../data";
import DeclarationsPage from "../../DeclarationsPage";

export default function PanoramaCssPage() {
  return <DeclarationsPage context={scopes.panoramaCss} hoist={[]}></DeclarationsPage>;
}
