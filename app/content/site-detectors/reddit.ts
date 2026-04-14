/*
 *   Copyright (c) 2026 Laith Alkhaddam aka Iconical.
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { isRedditHost } from "./hosts";
import {
  absoluteHttpUrl,
  cleanUrl,
  findDirectChildWithin,
  findFirstWithin,
  hasAnyWithin,
} from "./utils";
import type { UploadPlacement } from "./types";

const REDDIT_POST_SELECTOR =
  "shreddit-post, [data-testid='post-container'], [data-testid='post-unit']";

const REDDIT_PRIMARY_ACTION_ROW_SELECTOR =
  '[data-testid="action-row"], [data-testid="action-row"].shreddit-post-container, .shreddit-post-container[data-testid="action-row"]';

const REDDIT_ACTION_ROW_SELECTOR =
  "[slot='action-row'], [data-testid='action-row'], [data-testid='post-action-bar'], footer, [role='toolbar']";

const REDDIT_VOTE_CLUSTER_SELECTOR =
  "[id*='vote-arrows' i], [data-testid*='vote-arrows' i], [class*='vote-arrows' i], [class*='voteArrows' i], [slot*='vote' i]";

const REDDIT_UPVOTE_SELECTORS = [
  'button[aria-label*="upvote" i]',
  '[role="button"][aria-label*="upvote" i]',
  'button[data-testid*="upvote" i]',
  '[role="button"][data-testid*="upvote" i]',
  'button[id*="upvote" i]',
  '[role="button"][id*="upvote" i]',
  'faceplate-tracker[noun*="upvote" i]',
];

const REDDIT_DOWNVOTE_SELECTORS = [
  'button[aria-label*="downvote" i]',
  '[role="button"][aria-label*="downvote" i]',
  'button[data-testid*="downvote" i]',
  '[role="button"][data-testid*="downvote" i]',
  'button[id*="downvote" i]',
  '[role="button"][id*="downvote" i]',
  'faceplate-tracker[noun*="downvote" i]',
];

const REDDIT_VOTE_CONTROL_SELECTORS = [
  ...REDDIT_UPVOTE_SELECTORS,
  ...REDDIT_DOWNVOTE_SELECTORS,
];

const REDDIT_COMMENT_ACTION_SELECTORS = [
  '[data-testid="comment-button"]',
  '[id*="comment-button"]',
  'button[aria-label*="comment" i]',
  'a[aria-label*="comment" i]',
  'faceplate-tracker[noun="comments"]',
];

const REDDIT_SHARE_ACTION_SELECTORS = [
  '[data-testid="share-button"]',
  '[id*="share-button"]',
  'button[aria-label*="share" i]',
  'a[aria-label*="share" i]',
  'faceplate-tracker[noun="share_post"]',
];

const REDDIT_ACTION_HINT_SELECTORS = [
  ...REDDIT_COMMENT_ACTION_SELECTORS,
  ...REDDIT_SHARE_ACTION_SELECTORS,
];

const REDDIT_INSERT_AFTER_SELECTORS = [
  REDDIT_VOTE_CLUSTER_SELECTOR,
  ...REDDIT_DOWNVOTE_SELECTORS,
  ...REDDIT_UPVOTE_SELECTORS,
  ...REDDIT_COMMENT_ACTION_SELECTORS,
  ...REDDIT_SHARE_ACTION_SELECTORS,
];

function findNearestAncestorWithin(
  node: HTMLElement | null,
  stopAt: HTMLElement,
  selector: string,
) {
  let current: HTMLElement | null = node;
  while (current && current !== stopAt) {
    if (current.matches(selector)) return current;
    current = current.parentElement;
  }
  return null;
}

function hasAnyControlText(root: ParentNode, terms: string[]) {
  const controls = Array.from(
    root.querySelectorAll<HTMLElement>("button, [role='button'], a"),
  );

  return controls.some((node) => {
    const text = (node.textContent || "").replace(/\s+/g, " ").toLowerCase();
    return terms.some((term) => text.includes(term));
  });
}

function findControlByText(root: ParentNode, terms: string[]) {
  const controls = Array.from(
    root.querySelectorAll<HTMLElement>("button, [role='button'], a"),
  );

  for (const node of controls) {
    const text = (node.textContent || "").replace(/\s+/g, " ").toLowerCase();
    const label = (node.getAttribute("aria-label") || "")
      .replace(/\s+/g, " ")
      .toLowerCase();

    if (terms.some((term) => text.includes(term) || label.includes(term))) {
      return node;
    }
  }

  return null;
}

function findRedditActionRowByButtons(root: HTMLElement) {
  const controls = Array.from(
    root.querySelectorAll<HTMLElement>("button, [role='button']"),
  );

  const voteHint = controls.find((node) => {
    const label = (node.getAttribute("aria-label") || "").toLowerCase();
    const text = (node.textContent || "").replace(/\s+/g, " ").toLowerCase();
    return (
      label.includes("upvote") ||
      label.includes("downvote") ||
      text.includes("upvote") ||
      text.includes("downvote")
    );
  });

  if (!voteHint) return null;

  let current: HTMLElement | null = voteHint;
  while (current && current !== root) {
    const hasVoteSignals =
      hasAnyWithin(current, REDDIT_VOTE_CONTROL_SELECTORS) ||
      hasAnyControlText(current, ["upvote", "downvote"]);

    const hasActionSignals =
      hasAnyWithin(current, REDDIT_ACTION_HINT_SELECTORS) ||
      hasAnyControlText(current, ["share", "go to comments", "comment"]);

    if (hasVoteSignals && hasActionSignals) return current;
    current = current.parentElement;
  }

  const rootHasVoteSignals =
    hasAnyWithin(root, REDDIT_VOTE_CONTROL_SELECTORS) ||
    hasAnyControlText(root, ["upvote", "downvote"]);

  const rootHasActionSignals =
    hasAnyWithin(root, REDDIT_ACTION_HINT_SELECTORS) ||
    hasAnyControlText(root, ["share", "go to comments", "comment"]);

  if (rootHasVoteSignals && rootHasActionSignals) return root;
  return null;
}

function findRedditActionRowNearPost(container: HTMLElement) {
  let sibling = container.nextElementSibling as HTMLElement | null;
  let steps = 0;

  while (sibling && steps < 10) {
    const primary = sibling.matches(REDDIT_PRIMARY_ACTION_ROW_SELECTOR)
      ? sibling
      : sibling.querySelector<HTMLElement>(REDDIT_PRIMARY_ACTION_ROW_SELECTOR);

    if (primary) return primary;

    const byButtons = findRedditActionRowByButtons(sibling);
    if (byButtons) return byButtons;

    sibling = sibling.nextElementSibling as HTMLElement | null;
    steps += 1;
  }

  return null;
}

function findRedditActionRow(container: HTMLElement) {
  const primaryRow = container.querySelector<HTMLElement>(
    REDDIT_PRIMARY_ACTION_ROW_SELECTOR,
  );
  if (primaryRow) return primaryRow;

  const textActionControl = findControlByText(container, [
    "share",
    "go to comments",
    "comment",
  ]);

  if (textActionControl) {
    const rowFromTextControl =
      findNearestAncestorWithin(
        textActionControl,
        container,
        REDDIT_ACTION_ROW_SELECTOR,
      ) || textActionControl.parentElement;

    if (rowFromTextControl) return rowFromTextControl;
  }

  const rows = Array.from(
    container.querySelectorAll<HTMLElement>(REDDIT_ACTION_ROW_SELECTOR),
  );

  const actionHintRow = rows.find((row) =>
    hasAnyWithin(row, REDDIT_ACTION_HINT_SELECTORS),
  );
  if (actionHintRow) return actionHintRow;

  const buttonSemanticRow = findRedditActionRowByButtons(container);
  if (buttonSemanticRow) return buttonSemanticRow;

  const voteRow = rows.find((row) =>
    hasAnyWithin(row, REDDIT_VOTE_CONTROL_SELECTORS),
  );
  if (voteRow) return voteRow;

  const voteControl = findFirstWithin(container, REDDIT_VOTE_CONTROL_SELECTORS);
  if (!voteControl) return rows[0] || null;

  const rowFromVote = findNearestAncestorWithin(
    voteControl,
    container,
    REDDIT_ACTION_ROW_SELECTOR,
  );

  if (
    rowFromVote &&
    hasAnyWithin(rowFromVote, REDDIT_VOTE_CONTROL_SELECTORS) &&
    hasAnyWithin(rowFromVote, REDDIT_ACTION_HINT_SELECTORS)
  ) {
    return rowFromVote;
  }

  const voteCluster =
    findNearestAncestorWithin(
      voteControl,
      container,
      REDDIT_VOTE_CLUSTER_SELECTOR,
    ) || findFirstWithin(container, [REDDIT_VOTE_CLUSTER_SELECTOR]);

  if (voteCluster) {
    const rowFromCluster = findNearestAncestorWithin(
      voteCluster,
      container,
      REDDIT_ACTION_ROW_SELECTOR,
    );

    if (
      rowFromCluster &&
      hasAnyWithin(rowFromCluster, REDDIT_VOTE_CONTROL_SELECTORS)
    ) {
      return rowFromCluster;
    }

    let current: HTMLElement | null = voteCluster.parentElement;
    while (current && current !== container) {
      const hasVotes = hasAnyWithin(current, REDDIT_VOTE_CONTROL_SELECTORS);
      const hasActions = hasAnyWithin(current, REDDIT_ACTION_HINT_SELECTORS);
      if (hasVotes && hasActions) return current;
      current = current.parentElement;
    }
  }

  return rows[0] || null;
}

function getRedditPostIdFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/comments\/([a-z0-9_]+)/i);
    return match?.[1]?.toLowerCase() || "";
  } catch {
    return "";
  }
}

function detectRedditPermalinkUrl(container: HTMLElement) {
  const permalinkAnchor =
    container.querySelector<HTMLAnchorElement>(
      'a[href*="/comments/"][data-click-id="comments"]',
    ) ||
    container.querySelector<HTMLAnchorElement>(
      'a[href*="/comments/"][data-testid*="comments"]',
    ) ||
    container.querySelector<HTMLAnchorElement>(
      'a[href*="/comments/"][data-testid*="title"]',
    ) ||
    container.querySelector<HTMLAnchorElement>('a[href*="/comments/"]') ||
    null;

  const fromAnchor = absoluteHttpUrl(
    permalinkAnchor?.getAttribute("href") || "",
  );
  if (fromAnchor) return cleanUrl(fromAnchor);

  const fromPermalinkAttr = absoluteHttpUrl(
    container.getAttribute("permalink") || "",
  );
  if (fromPermalinkAttr) return cleanUrl(fromPermalinkAttr);

  const fromContentHref = absoluteHttpUrl(
    container.getAttribute("content-href") || "",
  );
  if (fromContentHref) return cleanUrl(fromContentHref);

  const fromPostPermalink = absoluteHttpUrl(
    container.getAttribute("post-permalink") ||
      container.getAttribute("data-permalink") ||
      "",
  );
  if (fromPostPermalink) return cleanUrl(fromPostPermalink);

  if (/\/comments\//i.test(window.location.pathname)) {
    return cleanUrl(window.location.href);
  }

  return "";
}

function detectRedditEmergencyPlacement(postIdFromUrl: string) {
  const mainCandidate = postIdFromUrl
    ? document.getElementById(`t3_${postIdFromUrl}`)
    : null;

  const mainPost =
    mainCandidate instanceof HTMLElement
      ? mainCandidate
      : document.querySelector<HTMLElement>('shreddit-post[id^="t3_"]');

  if (!mainPost) return null;

  const shareControl =
    findControlByText(mainPost, ["share"]) ||
    mainPost.querySelector<HTMLElement>(
      'faceplate-dropdown-menu.share-dropdown-menu button, button[aria-label*="share" i], [data-testid="share-button"]',
    ) ||
    null;

  if (!shareControl) return null;

  const anchor =
    findNearestAncestorWithin(
      shareControl,
      mainPost,
      "faceplate-dropdown-menu, .share-dropdown-menu",
    ) || shareControl.parentElement;

  if (!(anchor instanceof HTMLElement)) return null;

  const permalinkUrl = detectRedditPermalinkUrl(mainPost);
  const targetUrl = cleanUrl(permalinkUrl || window.location.href);
  if (!targetUrl) return null;

  const insertAfter = findDirectChildWithin(anchor, shareControl);

  return {
    id: `reddit:${targetUrl}`,
    platform: "reddit",
    anchor,
    insertAfter: insertAfter || undefined,
    targetUrl,
    title: document.title || "Reddit upload",
  } satisfies UploadPlacement;
}

export function detectRedditPlacements(): UploadPlacement[] {
  if (!isRedditHost(window.location.hostname)) return [];

  const out: UploadPlacement[] = [];
  const seen = new Set<string>();
  const postIdFromUrl = getRedditPostIdFromUrl(window.location.href);

  let candidates = Array.from(
    document.querySelectorAll<HTMLElement>(REDDIT_POST_SELECTOR),
  ).slice(0, 18);

  if (postIdFromUrl) {
    const mainPostById = document.getElementById(`t3_${postIdFromUrl}`);
    if (mainPostById && mainPostById instanceof HTMLElement) {
      candidates = [
        mainPostById,
        ...candidates.filter((candidate) => candidate !== mainPostById),
      ];
    }
  }

  for (const container of candidates) {
    const permalinkUrl = detectRedditPermalinkUrl(container);
    if (!permalinkUrl) continue;

    const anchor =
      findRedditActionRow(container) || findRedditActionRowNearPost(container);
    if (!anchor) continue;

    const targetUrl = cleanUrl(permalinkUrl || window.location.href);
    if (!targetUrl) continue;

    const id = `reddit:${targetUrl}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const insertAfterCandidate = findFirstWithin(
      anchor,
      REDDIT_INSERT_AFTER_SELECTORS,
    );

    const insertAfter = findDirectChildWithin(anchor, insertAfterCandidate);

    out.push({
      id,
      platform: "reddit",
      anchor,
      insertAfter: insertAfter || undefined,
      targetUrl,
      title: document.title || "Reddit upload",
    });
  }

  if (out.length === 0) {
    const emergency = detectRedditEmergencyPlacement(postIdFromUrl);
    if (emergency) out.push(emergency);
  }

  return out;
}
