import React, { useMemo, useState, useEffect, useSyncExternalStore } from "react";
import modifiersData from "@moddota/dota-data/files/vscripts/modifier_list.json";
import { ScrollableList } from "../Lists";
import { SearchBox, getSearchFromUrl, subscribeToSearchChange } from "../Search";
import { NavBar } from "../layout/NavBar";

const modifiers = modifiersData as Record<string, string[]>;
const specialCategories = ["generic", "neutral", "event", "items", "other", "special_bonus", "roshan", "rune"];

const categories = Object.entries(modifiers)
  .map(([name, items]) => ({ name, count: items.length, isHero: !specialCategories.includes(name) }))
  .sort((a, b) => { if (a.isHero !== b.isHero) return a.isHero ? 1 : -1; return a.name.localeCompare(b.name); });

export const allModifiers = Object.entries(modifiers)
  .flatMap(([category, names]) => names.map((name) => ({ name, category })))
  .sort((a, b) => a.name.localeCompare(b.name));

function getIconUrl(category: string, base: string): string | null {
  // No icon for these: "generic" has no hero portrait in public/images/heroes.
  if (category === "other" || category === "generic") return null;
  return `${base}images/heroes/${category}.png`;
}

function formatCategoryName(name: string): string {
  return name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ─── Native modifier data ───────────────────────────────────────────────────────
// dota-data's analysis of server.dll (`files/vscripts/native_modifiers.json`): the modifier
// functions every native modifier declares and, for each property, the value its handler
// returns as a formula. Fetched at runtime like the changelog (about 2 MB): in dev the
// changelog middleware serves all of dota-data/files. When the file is missing the cards
// show only the name.

const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
const DATA_BASE = isDev
  ? "/changelog-data"
  : "https://raw.githubusercontent.com/iwasinminedream/dota-data/master/files";

type FunctionStatus = "constant" | "formula" | "partial" | "unresolved" | "event";

// What one DLL's handler returns.
interface FunctionResult {
  status: FunctionStatus;
  formula?: string;
  specials?: string[];
  kv?: string[];
  reason?: string[];
}

// The DLL a function or a modifier exists in when only one of them has it.
type Side = "server" | "client";

interface NativeFunction extends FunctionResult {
  function: string;
  handler?: string;
  // client.dll's result where it differs from server.dll's (the fields above).
  client?: FunctionResult;
  // Declared by that DLL only; the fields above are its result.
  side?: Side;
}

interface NativeModifier {
  class: string;
  side?: Side;
  bases?: string[];
  ability?: string;
  abilities?: string[];
  functions?: NativeFunction[];
  fields?: Record<string, { in: string; value: string }[]>;
  // CheckState. `value` null with `when: "?"`: a path the analysis could not follow.
  states?: ModifierState[];
  // CheckState builds its states from data the analysis cannot read (KV, fields): no `states`.
  states_unresolved?: boolean;
}

interface ModifierState {
  state: string;
  value: boolean | null;
  when?: string;
}

interface NativeModifiers {
  version: string;
  modifiers: Record<string, NativeModifier>;
}

type KVValue = string | number | { [key: string]: KVValue };

/** A JSON file of dota-data, requested once for the page and shared by every card.
 *  `useData(load)` returns undefined until it has arrived, null when it is unavailable. */
function lazyData<T>(path: string) {
  let value: T | null | undefined;
  let requested = false;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const load = () => {
    if (requested) return;
    requested = true;
    fetch(`${DATA_BASE}/${path}`)
      .then((response) => (response.ok ? (response.json() as Promise<T>) : null))
      .catch(() => null)
      .then((data) => {
        value = data;
        listeners.forEach((listener) => listener());
      });
  };
  return function useData(shouldLoad: boolean): T | null | undefined {
    useEffect(() => {
      if (shouldLoad) load();
    }, [shouldLoad]);
    // Server snapshot undefined: hydration matches the server HTML even when the data is
    // already here (after a client-side navigation back to the page).
    return useSyncExternalStore(subscribe, () => value, () => undefined);
  };
}

const useNativeModifiers = lazyData<NativeModifiers>("vscripts/native_modifiers.json");

// Whether the file has client.dll's results too (older ones are server.dll's only).
const withClientCache = new WeakMap<NativeModifiers, boolean>();

function hasClientResults(native: NativeModifiers): boolean {
  let value = withClientCache.get(native);
  if (value === undefined) {
    value = Object.values(native.modifiers ?? {}).some(
      (entry) => entry.side !== undefined || (entry.functions ?? []).some((fn) => fn.client !== undefined || fn.side !== undefined),
    );
    withClientCache.set(native, value);
  }
  return value;
}
// For the special values (`%name%`) the formulas read; loaded once a card is opened.
const useAbilities = lazyData<Record<string, KVValue>>("abilities.json");

// "7 14 21 28" -> "7 / 14 / 21 / 28"
function formatLevels(value: KVValue | undefined): string {
  if (value === undefined) return "0";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim().split(/\s+/).join(" / ");
}

interface SpecialValue {
  value: string;
  bonuses: [string, string][];
}

/** A special value from the ability's AbilityValues: a number, a per-level string, or
 *  `{ value, special_bonus_*: "+10", ... }` (no `value` means 0 until a bonus applies). */
function getSpecialValue(abilities: Record<string, KVValue> | null | undefined, ability: string, name: string): SpecialValue | undefined {
  const kv = abilities?.[ability];
  const values = typeof kv === "object" ? kv.AbilityValues : undefined;
  if (typeof values !== "object") return undefined;
  const entry = values[name];
  if (entry === undefined) return undefined;
  if (typeof entry !== "object") return { value: formatLevels(entry), bonuses: [] };
  return {
    value: formatLevels(entry.value),
    bonuses: Object.entries(entry)
      .filter(([key]) => key.startsWith("special_bonus_"))
      .map(([key, bonus]): [string, string] => [key, formatLevels(bonus)]),
  };
}

function describeSpecialValue({ value, bonuses }: SpecialValue): string {
  return [value, ...bonuses.map(([key, bonus]) => `${key}: ${bonus}`)].join(", ");
}

// ─── Formulas ───────────────────────────────────────────────────────────────────

function luaSearchUrl(base: string, query: string): string {
  return `${base}api/vscripts?search=${encodeURIComponent(query)}`;
}

// The Lua callback of every modifier function is a method of CDOTA_Modifier_Lua.
function handlerUrl(base: string, handler: string): string {
  return `${base}api/vscripts/CDOTA_Modifier_Lua#${handler}`;
}

interface FormulaContext {
  base: string;
  special(name: string): string | undefined;
  field(name: string): string | undefined;
}

const linkStyle: React.CSSProperties = { color: "inherit", textDecoration: "none", borderBottom: "1px dotted var(--color-text-faded)" };
const unknownStyle: React.CSSProperties = { color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", borderRadius: 2, padding: "0 2px", fontWeight: 700, cursor: "help" };

// Special values, creation parameters, fields, enum names, `obj:Method(`, numbers, words, `?`.
const TOKEN =
  /(%\w+%)|\b(kv\.\w+)|\b(self\.field_\w+)|\b([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b|:(\w+)(?=\()|\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)|([A-Za-z_][\w.]*)|(\?)|(\s+)|([^])/g;

type FormulaToken = { kind: "special" | "kv" | "field" | "enum" | "method" | "number" | "unknown" | "text"; text: string; index: number };

/** Splits a formula into the parts that are highlighted. `?` is both the ternary operator
 *  and a part the analysis could not follow: it is the latter where an operand is expected. */
function* tokenizeFormula(text: string): Generator<FormulaToken> {
  let expectOperand = true;
  for (const match of text.matchAll(TOKEN)) {
    const [token, special, kv, field, enumName, method, number, word, question, space] = match;
    const index = match.index ?? 0;
    const operand = (kind: FormulaToken["kind"], value: string): FormulaToken => {
      expectOperand = false;
      return { kind, text: value, index };
    };
    if (special) yield operand("special", special);
    else if (kv) yield operand("kv", kv);
    else if (field) yield operand("field", field);
    else if (enumName) yield operand("enum", enumName);
    else if (method) {
      yield { kind: "text", text: ":", index };
      yield operand("method", method);
    } else if (number) yield operand("number", number);
    else if (question) {
      if (expectOperand) yield operand("unknown", "?");
      else {
        expectOperand = true;
        yield { kind: "text", text: "?", index };
      }
    } else {
      if (word) expectOperand = word === "and" || word === "or" || word === "not";
      else if (!space) expectOperand = token !== ")" && token !== "]";
      yield { kind: "text", text: token, index };
    }
  }
}

function hasUnknownPart(text: string): boolean {
  for (const token of tokenizeFormula(text)) if (token.kind === "unknown") return true;
  return false;
}

function renderFormula(text: string, ctx: FormulaContext): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let plain = "";
  for (const { kind, text: value, index: key } of tokenizeFormula(text)) {
    if (kind === "text") {
      plain += value;
      continue;
    }
    if (plain) out.push(plain);
    plain = "";
    switch (kind) {
      case "special": {
        const title = ctx.special(value.slice(1, -1));
        out.push(<span key={key} title={title} style={{ color: "var(--color-highlight)", fontWeight: 600, cursor: title ? "help" : undefined }}>{value}</span>);
        break;
      }
      case "kv":
        out.push(<span key={key} title="Creation parameter (the AddNewModifier table)" style={{ color: "var(--color-syntax-parameter)" }}>{value}</span>);
        break;
      case "field":
        out.push(<span key={key} title={ctx.field(value.slice("self.".length))} style={{ color: "var(--color-syntax-nil)" }}>{value}</span>);
        break;
      case "enum":
      case "method":
        out.push(<a key={key} href={luaSearchUrl(ctx.base, value)} style={linkStyle}>{value}</a>);
        break;
      case "number":
        out.push(<span key={key} style={{ color: "var(--color-syntax-literal)" }}>{value}</span>);
        break;
      case "unknown":
        out.push(<span key={key} title="Not resolved: the analysis could not follow this part" style={unknownStyle}>?</span>);
        break;
    }
  }
  if (plain) out.push(plain);
  return out;
}

const formulaStyle: React.CSSProperties = {
  margin: "3px 0 0",
  padding: "3px 8px",
  fontFamily: "monospace",
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  maxHeight: "18em",
  overflowY: "auto",
  background: "var(--color-group-members)",
  borderRadius: 3,
  color: "var(--color-text)",
};

function Formula({ text, ctx }: { text: string; ctx: FormulaContext }) {
  const nodes = useMemo(() => renderFormula(text, ctx), [text, ctx]);
  return <pre style={formulaStyle}>{nodes}</pre>;
}

// ─── Modifier card ──────────────────────────────────────────────────────────────

const statusInfo: Record<Exclude<FunctionStatus, "event">, { color: string; title: string }> = {
  constant: { color: "var(--color-text-faded)", title: "Always returns this value" },
  formula: { color: "var(--color-highlight)", title: "The value the handler returns" },
  partial: { color: "#f59e0b", title: "Parts marked ? could not be followed" },
  unresolved: { color: "#ef4444", title: "The analysis could not follow this handler" },
};

const sectionLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--color-text-faded)", textTransform: "uppercase", letterSpacing: "0.5px" };
const abilityLinkStyle: React.CSSProperties = { color: "#d97706", fontWeight: 600, textDecoration: "none" };

function abilityUrl(base: string, ability: string): string {
  return `${base}api/abilities?search=${encodeURIComponent(ability)}`;
}

function getStatusInfo(status: FunctionStatus) {
  return statusInfo[status as Exclude<FunctionStatus, "event">] ?? statusInfo.unresolved;
}

const badgeStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", cursor: "help" };

function StatusBadge({ status }: { status: FunctionStatus }) {
  const info = getStatusInfo(status);
  return <span title={info.title} style={{ ...badgeStyle, color: info.color }}>{status}</span>;
}

const sideInfo: Record<Side, { label: string; title: string }> = {
  server: { label: "server.dll only", title: "client.dll does not have it" },
  client: { label: "client.dll only", title: "server.dll does not have it: this is client.dll's result" },
};

function SideBadge({ side }: { side: Side }) {
  return <span title={sideInfo[side].title} style={{ ...badgeStyle, color: "var(--color-text-faded)" }}>{sideInfo[side].label}</span>;
}

const clientResultTitle =
  "client.dll's own copy of this handler returns something else: what the client predicts and shows in tooltips. " +
  "Often it is only the analysis reaching further in one DLL (a ? on one side) or the same test written differently.";

/** client.dll's result where it differs from server.dll's: one line until opened. */
function ClientResult({ result, ctx, values }: { result: FunctionResult; ctx: FormulaContext; values?: (name: string) => SpecialValue | undefined }) {
  const [open, setOpen] = useState(false);
  // The fields listed for the modifier are server.dll's; client.dll's have other offsets.
  const clientCtx = useMemo<FormulaContext>(() => ({ ...ctx, field: () => "A field of client.dll's copy of the modifier" }), [ctx]);
  return (
    <div style={{ marginTop: 3 }}>
      <button
        onClick={() => setOpen(!open)}
        title={clientResultTitle}
        style={{ display: "flex", alignItems: "baseline", gap: 8, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-faded)", textAlign: "left" }}
      >
        <span style={{ flexShrink: 0 }}>{open ? "▼" : "▶"} client.dll</span>
        <StatusBadge status={result.status} />
        {!open && result.formula !== undefined && (
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.formula}</span>
        )}
      </button>
      {open && <FunctionResultDetails result={result} ctx={clientCtx} values={values} />}
    </div>
  );
}

function FunctionResultDetails({ result, ctx, values }: { result: FunctionResult; ctx: FormulaContext; values?: (name: string) => SpecialValue | undefined }) {
  const specials = values ? (result.specials ?? []).map((name) => [name, values(name)] as const) : [];
  return (
    <>
      {result.formula !== undefined && <Formula text={result.formula} ctx={ctx} />}
      {result.status === "unresolved" && result.reason && result.reason.length > 0 && (
        <div style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>{result.reason.join("; ")}</div>
      )}
      {specials.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px", marginTop: 2, fontFamily: "monospace", fontSize: 12 }}>
          {specials.map(([name, value]) => (
            <span key={name}>
              <span style={{ color: "var(--color-highlight)" }}>{name}</span> = {value ? value.value : "?"}
              {value?.bonuses.map(([key, bonus]) => (
                <span key={key} style={{ color: "var(--color-text-faded)" }}> {key} {bonus}</span>
              ))}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function PropertyFunction({ fn, ctx, values }: { fn: NativeFunction; ctx: FormulaContext; values?: (name: string) => SpecialValue | undefined }) {
  return (
    <div style={{ borderLeft: `3px solid ${getStatusInfo(fn.status).color}`, paddingLeft: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0 10px", fontFamily: "monospace", fontSize: 12 }}>
        <a href={luaSearchUrl(ctx.base, fn.function)} style={{ ...linkStyle, fontWeight: 600 }}>{fn.function}</a>
        {fn.handler && (
          <a href={handlerUrl(ctx.base, fn.handler)} data-astro-reload style={{ ...linkStyle, color: "var(--color-text-dim)" }}>{fn.handler}</a>
        )}
        <StatusBadge status={fn.status} />
        {fn.side && <SideBadge side={fn.side} />}
      </div>
      <FunctionResultDetails result={fn} ctx={ctx} values={values} />
      {fn.client && <ClientResult result={fn.client} ctx={ctx} values={values} />}
    </div>
  );
}

/** What CheckState sets: each state true or false, with its condition when there is one. */
function ModifierStates({ states, unresolved, ctx }: { states: ModifierState[]; unresolved?: boolean; ctx: FormulaContext }) {
  const [showUnknown, setShowUnknown] = useState(false);
  const known = states.filter((state) => state.value !== null);
  const unknown = states.filter((state) => state.value === null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, fontFamily: "monospace", fontSize: 12 }}>
      <span style={sectionLabelStyle}>States</span>
      {unresolved && (
        <div style={{ color: "var(--color-text-faded)" }}>
          <span style={unknownStyle}>?</span> CheckState sets them from data the analysis cannot read (KV or fields)
        </div>
      )}
      {known.map((state, i) => (
        <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0 8px" }}>
          <a href={luaSearchUrl(ctx.base, state.state)} style={linkStyle}>{state.state}</a>
          <span style={{ color: state.value ? "#10b981" : "#ef4444", fontWeight: 600 }}>{String(state.value)}</span>
          {state.when && (
            <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              <span style={{ color: "var(--color-text-faded)" }}>when </span>
              {renderFormula(state.when, ctx)}
            </span>
          )}
        </div>
      ))}
      {unknown.length > 0 && (
        <div>
          <button
            onClick={() => setShowUnknown(!showUnknown)}
            title="The analysis could not follow whether CheckState sets these"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "monospace", fontSize: 12, color: "var(--color-text-faded)" }}
          >
            {showUnknown ? "\u25BC" : "\u25B6"} <span style={unknownStyle}>?</span> {unknown.length} {unknown.length === 1 ? "state" : "states"} not resolved
          </button>
          {showUnknown && (
            <div style={{ color: "var(--color-text-faded)", overflowWrap: "anywhere" }}>{unknown.map((state) => state.state).join(", ")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function NativeModifierDetails({ entry, version, withClient, base }: { entry: NativeModifier; version: string; withClient: boolean; base: string }) {
  const abilities = useAbilities(true);
  const [showFields, setShowFields] = useState(false);
  const functions = entry.functions ?? [];
  const properties = functions.filter((fn) => fn.status !== "event");
  const events = functions.filter((fn) => fn.status === "event");
  const fields = Object.entries(entry.fields ?? {});
  const states = entry.states ?? [];
  const ability = entry.ability;

  const ctx = useMemo<FormulaContext>(
    () => ({
      base,
      special: (name) => {
        if (!ability) return entry.abilities ? "A special value of one of the abilities listed above" : undefined;
        const value = getSpecialValue(abilities, ability, name);
        return value && `${name} = ${describeSpecialValue(value)}`;
      },
      field: (name) => {
        const writers = entry.fields?.[name];
        return writers && `Set in ${writers.map((writer) => writer.in).join(", ")}`;
      },
    }),
    [base, entry, ability, abilities],
  );
  const values = ability && abilities ? (name: string) => getSpecialValue(abilities, ability, name) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--color-group-border)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 16px", fontSize: 12 }}>
        <span>
          <span style={{ color: "var(--color-text-faded)" }}>class </span>
          <code>{[entry.class, ...(entry.bases ?? [])].join(" : ")}</code>
        </span>
        {ability && (
          <span>
            <span style={{ color: "var(--color-text-faded)" }}>ability </span>
            <a href={abilityUrl(base, ability)} style={abilityLinkStyle}>{ability}</a>
          </span>
        )}
        {entry.abilities && (
          <span title="Each of these abilities defines every special value used here">
            <span style={{ color: "var(--color-text-faded)" }}>abilities </span>
            {entry.abilities.map((name, i) => (
              <React.Fragment key={name}>
                {i > 0 && ", "}
                <a href={abilityUrl(base, name)} style={abilityLinkStyle}>{name}</a>
              </React.Fragment>
            ))}
          </span>
        )}
      </div>

      {properties.map((fn) => (
        <PropertyFunction key={fn.function} fn={fn} ctx={ctx} values={values} />
      ))}

      {(states.length > 0 || entry.states_unresolved) && (
        <ModifierStates states={states} unresolved={entry.states_unresolved} ctx={ctx} />
      )}

      {events.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 10px", fontFamily: "monospace", fontSize: 12 }}>
          <span style={sectionLabelStyle}>Events</span>
          {events.map((fn) => (
            <span key={fn.function}>
              {fn.handler ? (
                <a href={handlerUrl(base, fn.handler)} data-astro-reload title={fn.function} style={linkStyle}>{fn.handler}</a>
              ) : (
                <a href={luaSearchUrl(base, fn.function)} style={linkStyle}>{fn.function}</a>
              )}
              {fn.side && <> <SideBadge side={fn.side} /></>}
            </span>
          ))}
        </div>
      )}

      {fields.length > 0 && (
        <div>
          <button
            onClick={() => setShowFields(!showFields)}
            style={{ ...sectionLabelStyle, background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            {showFields ? "▼" : "▶"} Fields ({fields.length})
          </button>
          {showFields && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-faded)" }}>
                Fields of the modifier the game changes over time, and the functions that set them.
              </div>
              {fields.map(([name, writers]) => (
                <div key={name} style={{ fontFamily: "monospace", fontSize: 12 }}>
                  <span style={{ color: "var(--color-syntax-nil)" }}>self.{name}</span>
                  {writers.map((writer, i) => (
                    <div key={i} style={{ marginLeft: 12 }}>
                      <span style={{ color: "var(--color-text-faded)" }}>in {writer.in}</span>
                      <Formula text={writer.value} ctx={ctx} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {functions.length === 0 && states.length === 0 && !entry.states_unresolved && (
        <div style={{ fontSize: 12, color: "var(--color-text-faded)" }}>No modifier functions or states.</div>
      )}

      <div style={{ fontSize: 11, color: "var(--color-text-faded)" }}>
        {!withClient
          ? `Read from server.dll, build ${version}.`
          : entry.side === "client"
            ? `Read from client.dll, build ${version}: server.dll has no such modifier.`
            : entry.side === "server"
              ? `Read from server.dll, build ${version}: client.dll has no such modifier.`
              : `Read from server.dll and client.dll, build ${version}: client.dll's result is shown where it differs.`}{" "}
        <span style={unknownStyle}>?</span> marks a part the analysis could not follow.
      </div>
    </div>
  );
}

export function ModifierItem({ modifier }: { modifier: { name: string; category: string } }) {
  const [open, setOpen] = useState(false);
  // The modifiers page loads the data itself; elsewhere (the all-search page) a card loads it when opened.
  const native = useNativeModifiers(open);
  const entry = native?.modifiers?.[modifier.name];
  // Until the data is here a card might have it; without an entry there is nothing to open.
  const canOpen = native === undefined || !!entry || open;
  const functions = entry?.functions ?? [];
  const propertyCount = functions.filter((fn) => fn.status !== "event").length;
  const eventCount = functions.length - propertyCount;
  const states = entry?.states ?? [];
  const stateCount = new Set(states.filter((state) => state.value !== null).map((state) => state.state)).size;
  const partial =
    functions.some((fn) => fn.status === "partial" || fn.status === "unresolved") ||
    !!entry?.states_unresolved ||
    states.some((state) => state.value === null || (state.when !== undefined && hasUnknownPart(state.when)));
  const base = import.meta.env.BASE_URL;

  return (
    <div style={{ backgroundColor: "var(--color-group)", border: "1px solid var(--color-group-border)", borderRadius: 4, boxShadow: "2px 2px 6px var(--color-group-shadow)", padding: "6px 10px" }}>
      <div
        onClick={() => {
          // Selecting the name to copy it should not toggle the card.
          if (canOpen && !window.getSelection()?.toString()) setOpen(!open);
        }}
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: canOpen ? "pointer" : undefined }}
      >
        {canOpen && (
          <span style={{ fontSize: 10, color: "var(--color-text-faded)", width: 10, flexShrink: 0 }}>{open ? "▼" : "▶"}</span>
        )}
        <code style={{ fontSize: 14, fontWeight: 600, wordBreak: "break-word" }}>{modifier.name}</code>
        {entry && (
          <span style={{ marginLeft: "auto", display: "flex", gap: 10, flexShrink: 0, fontSize: 11, color: "var(--color-text-faded)" }}>
            {entry.side && <span title={sideInfo[entry.side].title}>{sideInfo[entry.side].label}</span>}
            {partial && <span style={{ color: "#f59e0b" }} title={statusInfo.partial.title}>partial</span>}
            {propertyCount > 0 && <span>{propertyCount} {propertyCount === 1 ? "property" : "properties"}</span>}
            {stateCount > 0 && <span>{stateCount} {stateCount === 1 ? "state" : "states"}</span>}
            {eventCount > 0 && <span>{eventCount} {eventCount === 1 ? "event" : "events"}</span>}
          </span>
        )}
      </div>
      {open && native === undefined && <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-text-faded)" }}>Loading…</div>}
      {open && native !== undefined && !entry && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-text-faded)" }}>
          {native
            ? `Not a native modifier of ${hasClientResults(native) ? "server.dll or client.dll" : "server.dll"}: no functions to show.`
            : "The modifier data could not be loaded."}
        </div>
      )}
      {open && entry && native && (
        <NativeModifierDetails entry={entry} version={native.version} withClient={hasClientResults(native)} base={base} />
      )}
    </div>
  );
}

export function renderItem(modifier: { name: string; category: string }, style?: React.CSSProperties) {
  return (
    <div style={{ padding: 6, ...style }} key={`${modifier.category}-${modifier.name}`}>
      <ModifierItem modifier={modifier} />
    </div>
  );
}

export function ModifiersPage() {
  const [search, setSearch] = useState(() => getSearchFromUrl());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("category");
  });
  // The list is rendered from the mounted render on: the server has no URL, so a
  // `?search=` link would otherwise not match the server HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Start loading the functions of every modifier with the page, for the card summaries.
  useNativeModifiers(true);

  useEffect(() => {
    const handler = () => { setSearch(getSearchFromUrl()); setSelectedCategory(new URLSearchParams(window.location.search).get("category")); };
    return subscribeToSearchChange(handler);
  }, []);

  const filtered = useMemo(() => {
    let f = allModifiers;
    if (selectedCategory) f = f.filter((m) => m.category === selectedCategory);
    if (search) { const q = search.toLowerCase(); f = f.filter((m) => m.name.toLowerCase().includes(q)); }
    return f;
  }, [search, selectedCategory]);

  // Use the statically-replaced configured base so hero-icon <img> SSR with the right
  // /moddota.github.io/ prefix (DOM <base> is empty during island SSR).
  const base = import.meta.env.BASE_URL;

  return (
    <>
      <NavBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }} className="api-page-content">
        <div style={{ width: 340, height: "100%", overflowY: "scroll", padding: "2px 12px" }} className="api-sidebar">
          <SidebarLink href={`${base}api/modifiers`} active={!selectedCategory}>All <Badge>{allModifiers.length}</Badge></SidebarLink>
          {categories.filter((c) => !c.isHero).map((cat, i, arr) => {
            const iconUrl = getIconUrl(cat.name, base);
            return (
              <React.Fragment key={cat.name}>
                <SidebarLink href={`${base}api/modifiers?category=${cat.name}`} active={selectedCategory === cat.name}>
                  {iconUrl && <HeroIcon src={iconUrl} />}
                  {formatCategoryName(cat.name)} <Badge>{cat.count}</Badge>
                </SidebarLink>
                {i === arr.length - 1 && <div style={{ borderTop: "1px solid var(--color-group-border)", margin: "6px 0" }} />}
              </React.Fragment>
            );
          })}
          {categories.filter((c) => c.isHero).map((cat) => {
            const iconUrl = getIconUrl(cat.name, base);
            return (
              <SidebarLink key={cat.name} href={`${base}api/modifiers?category=${cat.name}`} active={selectedCategory === cat.name}>
                {iconUrl && <HeroIcon src={iconUrl} />}
                {formatCategoryName(cat.name)} <Badge>{cat.count}</Badge>
              </SidebarLink>
            );
          })}
        </div>
        <main style={{ flex: 1, display: "flex", flexFlow: "column", minHeight: 0, overflowY: "auto", padding: "0 0 0 24px" }}>
          <SearchBox baseUrl="/modifiers" />
          {!mounted || (!search && !selectedCategory) ? (
            <>
              <div style={{ marginTop: 50, alignSelf: "center", fontSize: 24, textAlign: "center", color: "var(--color-text-faded)" }}>
                Use the search bar or select a category from the sidebar
              </div>
            </>
          ) : filtered.length > 0 ? (
            // Not virtualized: cards open in place, which a measured virtual row would clip.
            <ScrollableList data={filtered} render={renderItem} />
          ) : (
            <div style={{ marginTop: 50, alignSelf: "center", fontSize: 42, textAlign: "center" }}>No results found</div>
          )}
        </main>
      </div>
      <style>{`
        @media (max-width: 1100px) { .api-sidebar { width: 200px !important; } }
        @media (max-width: 768px) { .api-sidebar { width: 100% !important; max-height: 40vh; border-bottom: 1px solid var(--color-group-border); } .api-page-content { flex-direction: column; } }
      `}</style>
    </>
  );
}

function HeroIcon({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      style={{
        width: 20,
        height: 20,
        objectFit: "contain",
        borderRadius: 2,
        flexShrink: 0,
      }}
    />
  );
}

function SidebarLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <a href={href} style={{ background: active ? "var(--color-sidebar-hover)" : "var(--color-sidebar)", borderBottom: active ? "3px solid var(--color-highlight)" : "3px solid transparent", borderRadius: 3, padding: "2px 4px 0 4px", textDecoration: "none", color: "var(--color-text)", fontWeight: active ? 600 : "normal", display: "flex", alignItems: "center", gap: 4, fontSize: 13, marginBottom: 3 }}>{children}</a>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-faded)", fontWeight: "normal" }}>{children}</span>;
}
