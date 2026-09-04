import { RocketIcon } from "@sanity/icons/Rocket";
import type { Tool } from "sanity";
import { DeployTool } from "./DeployTool";

/**
 * The button that puts published content on the site.
 *
 * The site is static, so publishing changes what the API answers and nothing
 * else. Something has to start a build, and the two obvious candidates both
 * fail: building on every publish turns an afternoon of edits into an
 * afternoon of builds — Sanity's webhooks fire per document, so even「まとめて
 * 公開」's single transaction would be one build per document — and building on
 * a schedule means the site is either always a little stale or always burning
 * minutes on nothing.
 *
 * So a person decides. This tool writes one document, `deploy`, which is the
 * only type the webhook watches; one click is one build. It also names the
 * cities to rebuild, so a fix to 関西 does not spend a build on 東京.
 *
 * The cost of the trade is that someone can forget to press it, which is why
 * the list leads with how many published documents each city is waiting on.
 */
export const deployTool: Tool = {
  name: "deploy",
  title: "サイトに反映",
  icon: RocketIcon,
  component: DeployTool,
};
