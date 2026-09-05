import { createClient } from "@sanity/client";

/**
 * Migrate talks from `talk.session` to `session.talks` array.
 *
 * Usage:
 *   # Dry-run (read-only, shows planned changes):
 *   pnpm run migrate:talks:dry
 *
 *   # Execute migration (requires SANITY_WRITE_TOKEN):
 *   SANITY_WRITE_TOKEN=sk... pnpm run migrate:talks
 *
 *   # Execute migration and unset legacy fields:
 *   SANITY_WRITE_TOKEN=sk... pnpm run migrate:talks --delete-legacy
 *
 * Options:
 *   --dry-run        Print planned changes without writing to Sanity
 *   --delete-legacy  Unset 'session' and 'order' fields on talk documents (default: keep)
 */

const isDryRun = process.argv.includes("--dry-run");
const deleteLegacy = process.argv.includes("--delete-legacy");

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
  perspective: "raw",
});

const DRAFTS_PREFIX = "drafts.";
const publishedIdOf = (id) =>
  id.startsWith(DRAFTS_PREFIX) ? id.slice(DRAFTS_PREFIX.length) : id;

async function main() {
  console.log(
    `\nConnecting to Sanity project "${projectId}", dataset "${dataset}" (API ${apiVersion}, perspective: raw)...`,
  );
  if (isDryRun) {
    console.log("=== DRY RUN MODE: No changes will be written ===\n");
  }

  // 1. Fetch all talks (both published and drafts) that have a session reference
  const talks = await client.fetch(
    `*[_type == "talk" && (defined(session._ref) || defined(session))]{
      _id,
      title,
      order,
      "sessionId": coalesce(session._ref, session)
    }`,
  );

  if (talks.length === 0) {
    console.log(
      "No talks with `session` reference found. Migration not needed.",
    );
    return;
  }

  console.log(`Found ${talks.length} talk document(s) with session references.`);

  // Group talks by published talk ID to prioritize draft over published for grouping
  const talksByPublishedId = new Map();
  for (const doc of talks) {
    const pubId = publishedIdOf(doc._id);
    const isDraft = doc._id.startsWith(DRAFTS_PREFIX);
    if (!talksByPublishedId.has(pubId) || isDraft) {
      talksByPublishedId.set(pubId, doc);
    }
  }

  // Group unique talks by published session ID
  const talksBySession = new Map();
  for (const talk of talksByPublishedId.values()) {
    const pubSessionId = publishedIdOf(talk.sessionId);
    const list = talksBySession.get(pubSessionId) ?? [];
    list.push(talk);
    talksBySession.set(pubSessionId, list);
  }

  const targetSessionIds = [...talksBySession.keys()];
  console.log(
    `Identified ${targetSessionIds.length} unique session(s) to update.\n`,
  );

  // 2. Fetch existing sessions (both published and drafts) to inspect existing talks arrays
  const existingSessionDocs = await client.fetch(
    `*[_type == "session" && (_id in $ids || _id in $draftIds)]{
      _id,
      title,
      talks
    }`,
    {
      ids: targetSessionIds,
      draftIds: targetSessionIds.map((id) => `${DRAFTS_PREFIX}${id}`),
    },
  );

  const sessionDocsById = new Map(
    existingSessionDocs.map((doc) => [doc._id, doc]),
  );

  const tx = client.transaction();
  let mutationCount = 0;

  // 3. Plan patches for each session
  for (const [sessionId, sessionTalks] of talksBySession.entries()) {
    // Sort by order asc
    sessionTalks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    console.log(`Session [${sessionId}]:`);
    for (const t of sessionTalks) {
      const draftNote = t._id.startsWith(DRAFTS_PREFIX) ? " (draft)" : "";
      console.log(
        `  - #${t.order ?? "?"} [${publishedIdOf(t._id)}] "${t.title ?? "(untitled)"}"${draftNote}`,
      );
    }

    // Determine target session documents (published and/or draft)
    const publishedSession = sessionDocsById.get(sessionId);
    const draftSession = sessionDocsById.get(`${DRAFTS_PREFIX}${sessionId}`);
    const docsToPatch = [publishedSession, draftSession].filter(Boolean);

    if (docsToPatch.length === 0) {
      console.warn(
        `  [WARN] Neither published nor draft session document found for [${sessionId}]!`,
      );
      continue;
    }

    for (const sDoc of docsToPatch) {
      const existingTalks = Array.isArray(sDoc.talks) ? sDoc.talks : [];
      const existingRefs = new Set(
        existingTalks
          .map((r) => r?._ref)
          .filter(Boolean)
          .map(publishedIdOf),
      );

      // Merge: preserve existing references, append any unlisted talks
      const toAdd = sessionTalks.filter(
        (t) => !existingRefs.has(publishedIdOf(t._id)),
      );

      const mergedTalks = [
        ...existingTalks,
        ...toAdd.map((t, index) => {
          const pubTalkId = publishedIdOf(t._id);
          return {
            _key: `talk_${pubTalkId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}_${index}`,
            _type: "reference",
            _ref: pubTalkId,
          };
        }),
      ];

      if (isDryRun) {
        console.log(
          `  -> [${sDoc._id}]: Would update talks: ${existingTalks.length} existing + ${toAdd.length} added = ${mergedTalks.length} total`,
        );
      } else {
        tx.patch(sDoc._id, (p) => p.set({ talks: mergedTalks }));
        mutationCount++;
      }
    }

    // Optional: unset legacy fields on talks
    if (deleteLegacy) {
      for (const t of sessionTalks) {
        const pubTalkId = publishedIdOf(t._id);
        const talkDocsToClean = [
          pubTalkId,
          `${DRAFTS_PREFIX}${pubTalkId}`,
        ];

        for (const tId of talkDocsToClean) {
          if (isDryRun) {
            console.log(`  -> Would unset 'session' and 'order' on [${tId}]`);
          } else {
            tx.patch(tId, (p) => p.unset(["session", "order"]));
            mutationCount++;
          }
        }
      }
    }
    console.log("");
  }

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
