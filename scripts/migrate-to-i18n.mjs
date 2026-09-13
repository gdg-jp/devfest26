import { createClient } from "@sanity/client";
import { randomUUID } from "node:crypto";

/**
 * Wraps the plain-string fields this project used to store in Japanese only
 * into the internationalized-array shape `sanity-plugin-internationalized-array`
 * expects: `[{ _key, _type, language, value }]`.
 *
 * A field that had an `*En` sibling (only `event.titleEn` / `event.subtitleEn`)
 * becomes a two-item array — one `ja` item from the old field, one `en` item
 * from the old sibling. Every other field becomes a one-item `ja` array; the
 * `en` item is added later, in the Studio, once someone translates it. Nothing
 * here invents an English value.
 *
 * Idempotent: a field whose current value already looks like an
 * internationalized array (an array of objects each carrying `language`) is
 * left untouched, so running this twice — or resuming after a partial
 * failure — does not double-wrap anything.
 *
 * Usage:
 *   # Dry-run (read-only, shows planned changes):
 *   pnpm run migrate:i18n:dry
 *
 *   # Execute migration (requires SANITY_WRITE_TOKEN):
 *   SANITY_WRITE_TOKEN=sk... pnpm run migrate:i18n
 *
 * Options:
 *   --dry-run   Print planned changes without writing to Sanity
 */

const isDryRun = process.argv.includes("--dry-run");

const projectId =
  process.env.SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID;
const dataset =
  process.env.SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  "production";
const apiVersion = process.env.SANITY_API_VERSION || "2026-01-01";
const token =
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_AUTH_TOKEN ||
  process.env.SANITY_TOKEN;

if (!projectId) {
  console.error("Error: SANITY_PROJECT_ID is not set.");
  process.exit(1);
}

if (!isDryRun && !token) {
  console.error("Error: Write token is required to perform migration.");
  console.error("Please set SANITY_WRITE_TOKEN or run with --dry-run.");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
  // Raw so that draft and published copies of a document both come back as
  // their own row — a half-translated draft must migrate too, or it fails
  // Studio validation against the new schema the moment somebody opens it.
  perspective: "raw",
});

/**
 * `sanity-plugin-internationalized-array`'s per-`fieldTypes` value-object
 * name. The plugin builds it as internationalizedArray + pascalCase(name) +
 * "Value" (see `createFieldName` in its dist), so these have to match the
 * names in `fieldTypes` in `studio/sanity.config.ts` exactly.
 *
 * Getting one wrong is a quiet failure: GROQ reads `language` and `value` and
 * never looks at `_type`, so the site would render correctly while the Studio
 * showed "Unknown type" on every one of those fields.
 */
const VALUE_TYPE = {
  string: "internationalizedArrayStringValue",
  text: "internationalizedArrayTextValue",
  richText: "internationalizedArrayRichTextValue",
  stringList: "internationalizedArrayStringListValue",
};

const isI18nArray = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => item && typeof item === "object" && "language" in item);

const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

function i18nItem(kind, language, value) {
  return {
    _key: randomUUID().slice(0, 12),
    _type: VALUE_TYPE[kind],
    language,
    value,
  };
}

/**
 * One field's old value (and optional English sibling), as the array
 * `set()` should write — or `undefined` when there is nothing to do:
 * already migrated, or both the Japanese value and the English sibling are
 * empty.
 */
function wrap(kind, jaValue, enValue) {
  if (isI18nArray(jaValue)) return undefined;

  const items = [];
  if (!isEmpty(jaValue)) items.push(i18nItem(kind, "ja", jaValue));
  if (!isEmpty(enValue)) items.push(i18nItem(kind, "en", enValue));
  return items.length > 0 ? items : undefined;
}

/** `wrap()` applied to a set of top-level scalar fields, collected into `set`. */
function wrapFields(doc, set, fields) {
  for (const [field, kind] of Object.entries(fields)) {
    const wrapped = wrap(kind, doc[field]);
    if (wrapped) set[field] = wrapped;
  }
}

/**
 * The same wrapping, applied inside every item of an array-of-objects field
 * (`nav`, `fixtures`, `program`, ...) — each item keeps its own `_key` and
 * every field this doesn't touch.
 */
function remapArrayItems(array, fields) {
  if (!Array.isArray(array)) return undefined;

  // `undefined` unless something actually changed, so a second run reports
  // the document as up to date instead of patching it with its own contents.
  let changed = false;
  const next = array.map((item) => {
    const copy = { ...item };
    for (const [field, kind] of Object.entries(fields)) {
      const wrapped = wrap(kind, item[field]);
      if (wrapped) {
        copy[field] = wrapped;
        changed = true;
      }
    }
    return copy;
  });

  return changed ? next : undefined;
}

/**
 * Whether an `*En` sibling's value has actually made it into the
 * internationalized array, and so is safe to remove.
 *
 * Not the same question as "did this run write the array". A `title` that is
 * already in the new shape — because somebody opened the Studio between the
 * schema deploy and this migration — may still carry no `en` item, and
 * unsetting `titleEn` against that would delete the English title rather than
 * migrate it.
 */
function absorbed(doc, set, field, sibling) {
  if (isEmpty(doc[sibling])) return true;

  const target = set[field] ?? doc[field];
  return (
    Array.isArray(target) &&
    target.some((item) => item?.language === "en" && !isEmpty(item.value))
  );
}

function planEvent(doc) {
  const set = {};

  const titleWrapped = wrap("string", doc.title, doc.titleEn);
  if (titleWrapped) set.title = titleWrapped;
  const subtitleWrapped = wrap("string", doc.subtitle, doc.subtitleEn);
  if (subtitleWrapped) set.subtitle = subtitleWrapped;

  wrapFields(doc, set, {
    description: "text",
    taglineLead: "string",
    taglineAccent: "string",
    socialLabel: "string",
    format: "string",
    formatShort: "string",
    fee: "string",
  });

  if (doc.venue) {
    const venueSet = {};
    wrapFields(doc.venue, venueSet, {
      name: "string",
      area: "string",
      city: "string",
      region: "string",
    });
    for (const [field, value] of Object.entries(venueSet)) {
      set[`venue.${field}`] = value;
    }
  }

  const nav = remapArrayItems(doc.nav, { label: "string" });
  if (nav) set.nav = nav;
  const footerNav = remapArrayItems(doc.footerNav, { label: "string" });
  if (footerNav) set.footerNav = footerNav;
  const fixtures = remapArrayItems(doc.fixtures, {
    label: "string",
    note: "string",
  });
  if (fixtures) set.fixtures = fixtures;

  const unset = [];
  const warnings = [];

  for (const [field, sibling] of [
    ["title", "titleEn"],
    ["subtitle", "subtitleEn"],
  ]) {
    if (doc[sibling] === undefined) continue;
    if (absorbed(doc, set, field, sibling)) unset.push(sibling);
    else
      warnings.push(
        `left ${sibling} in place — ${field} is already an internationalized ` +
          `array with no "en" item, so removing ${sibling} would lose the ` +
          `English value. Copy it into ${field} (English) in the Studio, then ` +
          `run this again.`,
      );
  }

  // Derived from the build language now; see `src/i18n/language.ts`.
  for (const field of ["lang", "locale"])
    if (doc[field] !== undefined) unset.push(field);

  return { set, unset, warnings };
}

function planAboutPage(doc) {
  const set = {};
  wrapFields(doc, set, {
    lead: "string",
    callout: "string",
    audienceEyebrow: "string",
    audienceHeading: "string",
  });

  const body = wrap("richText", doc.body);
  if (body) set.body = body;
  const audienceItems = wrap("stringList", doc.audienceItems);
  if (audienceItems) set.audienceItems = audienceItems;

  return { set, unset: [] };
}

function planSession(doc) {
  const set = {};
  wrapFields(doc, set, { title: "string" });
  const abstract = wrap("richText", doc.abstract);
  if (abstract) set.abstract = abstract;
  return { set, unset: [] };
}

function planTalk(doc) {
  return planSession(doc);
}

function planSpeaker(doc) {
  const set = {};
  wrapFields(doc, set, { name: "string", role: "string" });
  const bio = wrap("richText", doc.bio);
  if (bio) set.bio = bio;
  return { set, unset: [] };
}

function planTrack(doc) {
  const set = {};
  wrapFields(doc, set, {
    label: "string",
    sub: "string",
    cardLabel: "string",
  });
  return { set, unset: [] };
}

function planMeetup(doc) {
  const set = {};
  wrapFields(doc, set, {
    title: "string",
    subtitle: "string",
    venue: "string",
    capacity: "string",
    fee: "string",
    cta: "string",
  });
  const description = wrap("richText", doc.description);
  if (description) set.description = description;
  const program = remapArrayItems(doc.program, {
    what: "string",
    who: "string",
  });
  if (program) set.program = program;
  return { set, unset: [] };
}

function planPartner(doc) {
  const set = {};
  const description = wrap("richText", doc.description);
  if (description) set.description = description;
  return { set, unset: [] };
}

function planExternalEvent(doc) {
  const set = {};
  wrapFields(doc, set, {
    title: "string",
    region: "string",
    city: "string",
    venue: "string",
  });
  const note = wrap("text", doc.note);
  if (note) set.note = note;
  return { set, unset: [] };
}

const PLANNERS = {
  event: planEvent,
  aboutPage: planAboutPage,
  session: planSession,
  talk: planTalk,
  speaker: planSpeaker,
  track: planTrack,
  meetup: planMeetup,
  partner: planPartner,
  externalEvent: planExternalEvent,
};

async function main() {
  console.log(
    `\nConnecting to Sanity project "${projectId}", dataset "${dataset}" (API ${apiVersion}, perspective: raw)...`,
  );
  if (isDryRun) {
    console.log("=== DRY RUN MODE: No changes will be written ===\n");
  }

  const types = Object.keys(PLANNERS);
  const docs = await client.fetch(`*[_type in $types]`, { types });

  if (docs.length === 0) {
    console.log("No matching documents found.");
    return;
  }

  console.log(`Found ${docs.length} document(s) across ${types.join(", ")}.\n`);

  const tx = client.transaction();
  let mutationCount = 0;
  let skipped = 0;
  let warningCount = 0;

  for (const doc of docs) {
    const planner = PLANNERS[doc._type];
    const { set, unset, warnings = [] } = planner(doc);
    const hasSet = Object.keys(set).length > 0;
    const hasUnset = unset.length > 0;

    // Printed whether or not the document is otherwise being touched: one
    // that needs nothing else can still be one somebody half-migrated by hand.
    for (const warning of warnings) {
      console.warn(`[${doc._type}] ${doc._id}: WARNING — ${warning}`);
      warningCount++;
    }

    if (!hasSet && !hasUnset) {
      skipped++;
      continue;
    }

    const summary = [
      hasSet && `set ${Object.keys(set).join(", ")}`,
      hasUnset && `unset ${unset.join(", ")}`,
    ]
      .filter(Boolean)
      .join(" ; ");
    console.log(`[${doc._type}] ${doc._id}: ${summary}`);

    if (!isDryRun) {
      tx.patch(doc._id, (p) => {
        if (hasSet) p.set(set);
        if (hasUnset) p.unset(unset);
        return p;
      });
      mutationCount++;
    }
  }

  console.log(
    `\n${docs.length - skipped} document(s) to migrate, ${skipped} already up to date.`,
  );

  if (warningCount > 0)
    console.warn(
      `${warningCount} warning(s) above — those fields were left untouched.`,
    );

  if (isDryRun) {
    console.log("Migration dry-run complete! No changes were written.");
  } else if (mutationCount > 0) {
    console.log(`Committing transaction with ${mutationCount} mutations...`);
    await tx.commit();
    console.log("Migration transaction committed successfully!");
  } else {
    console.log("No mutations needed.");
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
