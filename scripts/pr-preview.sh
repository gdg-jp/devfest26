#!/usr/bin/env bash
#
# The three parts of a pull request's preview that are not wrangler, kept out
# of `build.yml` so they can be run against a local `dist/` before they are
# trusted with a real pull request. See `pr-preview/README.md`.
#
#   bash scripts/pr-preview.sh assemble <site-dir> <artifacts-dir>
#   bash scripts/pr-preview.sh body > comment.md
#   bash scripts/pr-preview.sh comment [--update-only] < comment.md
#
# Everything about the run comes in through the environment, as it does for
# `publish`: city slugs are written in the CMS, and `${{ }}` would paste them
# into the shell as code.
set -euo pipefail

# The language whose pages are at the root rather than under a prefix. The
# same assumption `publish` in `build.yml` makes.
DEFAULT_LANG=ja

# Every (language, target) pair the run built, as "<lang> <target>" lines,
# front pages first. Read from `BUILDS_JSON`, discover's `builds` output.
pairs() {
  jq -r 'sort_by(.target != "portal") | .[] | "\(.lang) \(.target)"' <<< "$BUILDS_JSON"
}

# Where a pair's pages are on the site: `/`, `/kansai`, `/en`, `/en/kansai`.
path_of() {
  local lang="$1" target="$2" path
  path="/$target"
  if [ "$target" = portal ]; then path=/; fi
  if [ "$lang" != "$DEFAULT_LANG" ]; then path="/$lang${path%/}"; fi
  printf '%s' "$path"
}

# `publish`'s graft without the half of it that is about a site already there:
# nothing to take down and nothing to leave in place, because the directory
# starts empty. Each pair goes where `publish` puts it, and one that did not
# build is named rather than guessed at.
#
# Writes `built` — the pairs that made it, as "lang/target" words — to
# `GITHUB_OUTPUT` when there is one.
assemble() {
  local site="$1" artifacts="$2"
  mkdir -p "$site"

  # A file, not a process substitution, for the reason `publish` gives: an
  # empty list that should have been an error would read as "nothing to do".
  # Front pages first, because the default language's owns the root and
  # copying it in after a city would be copying it over one.
  local list
  list="$(mktemp)"
  pairs > "$list"
  local builds=()
  mapfile -t builds < "$list"
  rm -f "$list"
  if [ "${#builds[@]}" -eq 0 ]; then
    echo "::error::discover produced no builds; nothing to preview"
    return 1
  fi

  local built=() pair lang target from prefix src dest
  for pair in "${builds[@]}"; do
    read -r lang target <<< "$pair"
    from="$artifacts/site-$lang-$target"
    prefix=""
    if [ "$lang" != "$DEFAULT_LANG" ]; then prefix="/$lang"; fi

    # A city's build is self-contained under `<slug>/` (`soleCity` in
    # `src/tenants/selection.ts`); a front page's is the whole of its root.
    if [ "$target" = portal ]; then
      src="$from$prefix"
      dest="$site$prefix"
    else
      src="$from$prefix/$target"
      dest="$site$prefix/$target"
    fi

    if [ ! -d "$src" ]; then
      echo "::warning::$lang/$target did not build; the preview goes up without it"
      continue
    fi

    echo "$lang/$target → $(path_of "$lang" "$target")"
    if [ "$target" != portal ]; then rm -rf "$dest"; fi
    mkdir -p "$dest"
    cp -r "$src/." "$dest/"

    # Any other language's front page shares the root's `_astro/`, and adds to
    # it without replacing anything — the same `cp -n` as `publish`.
    if [ "$target" = portal ] && [ -n "$prefix" ] && [ -d "$from/_astro" ]; then
      mkdir -p "$site/_astro"
      cp -rn "$from/_astro/." "$site/_astro/"
    fi
    built+=("$lang/$target")
  done

  if [ "${#built[@]}" -eq 0 ]; then
    echo "::error::not one page built; nothing to preview"
    return 1
  fi

  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "built=${built[*]}" >> "$GITHUB_OUTPUT"
  fi
}

# The comment: the URL, and a table with a link to every page the run was
# asked for, so a review can go straight to the city a pull request is about.
#
# Reads URL, DEPLOYMENT_URL, BUILDS_JSON, BUILT, HEAD_SHA and BASE_REF.
body() {
  local url="${URL%/}" langs=() targets=() lang target label path missing=""
  mapfile -t langs < <(pairs | awk '!seen[$1]++ { print $1 }')
  mapfile -t targets < <(pairs | awk '!seen[$2]++ { print $2 }')

  echo "### 🔍 プレビュー"
  echo
  echo "$url"
  echo
  echo "\`${HEAD_SHA::7}\` を \`$BASE_REF\` にマージした結果のビルドです。公開サイトになるものと同じファイルを、GitHub Pages ではなく Cloudflare Workers の Preview で配信しています。"
  echo

  printf '|  |'
  for lang in "${langs[@]}"; do printf ' %s |' "$lang"; done
  printf '\n| --- |'
  for lang in "${langs[@]}"; do printf ' --- |'; done
  echo

  for target in "${targets[@]}"; do
    label="$target"
    if [ "$target" = portal ]; then label="トップ"; fi
    printf '| %s |' "$label"
    for lang in "${langs[@]}"; do
      path="$(path_of "$lang" "$target")"
      if [[ " $BUILT " == *" $lang/$target "* ]]; then
        printf ' [`%s`](%s%s) |' "$path" "$url" "$path"
      else
        printf ' ❌ |'
        missing=1
      fi
    done
    echo
  done

  if [ -n "$missing" ]; then
    echo
    echo "> [!WARNING]"
    echo "> ❌ はビルドに失敗したため、このプレビューに含まれていないページです。原因は Build ワークフローの該当ジョブにあります。"
  fi

  if [ -n "${DEPLOYMENT_URL:-}" ]; then
    echo
    echo "<sub>このコミットのビルドを指し続ける URL: $DEPLOYMENT_URL</sub>"
  fi
}

# Edits the comment this script wrote before, or writes it if there is none:
# one comment per pull request, kept current, rather than one more per push.
# `--update-only` edits it if it exists and otherwise does nothing — the
# cleanup's case, where a pull request that never had a preview does not need
# telling that it no longer has one.
#
# Reads GH_TOKEN, GITHUB_REPOSITORY and PR_NUMBER.
comment() {
  # Found by this rather than as "the bot's last comment", which is what
  # `gh pr comment --edit-last` edits: any other workflow commenting as the
  # same bot would have its comment overwritten.
  local marker='<!-- devfest26:pr-preview -->' body ids id
  body="$marker"$'\n'"$(cat)"

  # Every page, then the first match. Not `| head -n1`: under `pipefail`, gh
  # being cut off partway through a long thread would fail the step.
  ids="$(gh api --paginate "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/comments" \
    --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | startswith(\"$marker\"))) | .id")"
  id="${ids%%$'\n'*}"

  if [ -n "$id" ]; then
    gh api --method PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" \
      -f body="$body" > /dev/null
  elif [ "${1:-}" != "--update-only" ]; then
    gh api --method POST "repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/comments" \
      -f body="$body" > /dev/null
  fi
}

command="${1:-}"
shift || true
case "$command" in
  assemble) assemble "$@" ;;
  body) body "$@" ;;
  comment) comment "$@" ;;
  *)
    echo "usage: $0 assemble <site-dir> <artifacts-dir> | body | comment [--update-only]" >&2
    exit 2
    ;;
esac
