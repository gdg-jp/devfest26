import { PublishIcon } from "@sanity/icons/Publish";
import type { Tool } from "sanity";
import { BatchPublishTool } from "./BatchPublishTool";

/**
 * A tool for publishing a chosen set of drafts in one go.
 *
 * Two problems with publishing one document at a time made this worth
 * building. The first is that a strong reference is validated against the
 * *published* dataset, so a session whose speaker is still a draft cannot be
 * published until the speaker is — which forces the speaker out into the open
 * on their own, ahead of the announcement, purely to satisfy an integrity
 * check. Publishing both in one transaction removes the ordering entirely:
 * integrity is checked once, against the state the transaction produces.
 *
 * The second is that every publish is a webhook, and every webhook is a build.
 * Preparing a city's content is dozens of publishes over an afternoon; as one
 * batch it is one.
 *
 * Deliberately not "publish everything": the list starts empty and the author
 * ticks what is ready. Anything half-written stays where it is.
 */
export const batchPublishTool: Tool = {
  name: "batch-publish",
  title: "まとめて公開",
  icon: PublishIcon,
  component: BatchPublishTool,
};
