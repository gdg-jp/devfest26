import { createClient } from "@sanity/client";

/**
 * Migrate talks from `talk.session` to `session.talks` array.
 *
 * Usage:
 *   # Dry-run (read-only, shows what would change):
 *   node --env-file=.env scripts/migrate-talks-to-sessions.mjs --dry-run
 *
 *   # Execute migration (requires SANITY_WRITE_TOKEN or SANITY_AUTH_TOKEN):
 *   SANITY_WRITE_TOKEN=sk... node --env-file=.env scripts/migrate-talks-to-sessions.mjs
 *
 * Options:
 *   --dry-run       Print planned changes without writing to Sanity
 *   --keep-legacy   Keep `session` and `order` fields on talk documents
 */

const isDryRun = process.argv.includes("--dry-run");
const keepLegacy = process.argv.includes("--keep-legacy");

const projectId = process.env.SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || process.env.SANITY_STUDIO_DATASET || "production";
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
  apiVersion: "2026-02-01",
  token,
  useCdn: false,
});

async function main() {
  console.log(`\nConnecting to Sanity project "${projectId}", dataset "${dataset}"...`);
  if (isDryRun) {
    console.log("=== DRY RUN MODE: No changes will be written ===\n");
  }

  // 1. Fetch all talks that have a session reference
  const talks = await client.fetch(
    `*[_type == "talk" && defined(session._ref)]{
      _id,
      title,
      order,
      "sessionId": session._ref
    }`,
  );

  if (talks.length === 0) {
    console.log("No talks with `session` reference found. Migration not needed.");
    return;
  }

  console.log(`Found ${talks.length} talk(s) with session references.`);

  // 2. Group talks by sessionId
  const talksBySession = new Map();
  for (const talk of talks) {
    const list = talksBySession.get(talk.sessionId) ?? [];
    list.push(talk);
    talksBySession.set(talk.sessionId, list);
  }

  console.log(`Identified ${talksBySession.size} session(s) to update.\n`);

  // 3. Process each session
  for (const [sessionId, sessionTalks] of talksBySession.entries()) {
    // Sort by order asc
    sessionTalks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const talkRefs = sessionTalks.map((t, index) => ({
      _key: `talk_${t._id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}_${index}`,
      _type: "reference",
      _ref: t._id,
    }));

    console.log(`Session [${sessionId}]:`);
    for (const t of sessionTalks) {
      console.log(`  - #${t.order ?? "?"} [${t._id}] "${t.title ?? "(untitled)"}"`);
    }

    if (isDryRun) {
      console.log(`  -> Would set ${talkRefs.length} talk reference(s) on session ${sessionId}`);
    } else {
      console.log(`  -> Setting talks references on session [${sessionId}]...`);
      await client.patch(sessionId).set({ talks: talkRefs }).commit();
      console.log(`  -> Done.`);
    }

    // Unset legacy fields on talk documents unless --keep-legacy
    if (!keepLegacy) {
      for (const t of sessionTalks) {
        if (isDryRun) {
          console.log(`  -> Would unset 'session' and 'order' on talk [${t._id}]`);
        } else {
          console.log(`  -> Unsetting 'session' and 'order' on talk [${t._id}]...`);
          await client.patch(t._id).unset(["session", "order"]).commit();
        }
      }
    }
    console.log("");
  }

  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
