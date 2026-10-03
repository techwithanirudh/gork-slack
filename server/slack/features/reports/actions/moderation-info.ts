import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from '@slack/bolt';
import { Section } from 'slack-block-builder';
import { asBlocks } from '~/lib/slack/blocks';

export const name = 'moderation_info';

const MODAL_CONTENT: Record<string, { title: string; text: string }> = {
  ban: {
    title: 'Manual Ban',
    text: "Moderators can ban users from Gork at their own discretion if they violate Gork's terms of use or community guidelines.\n\nBanned users cannot interact with Gork in any channel. If you believe a ban was issued in error, contact a moderator directly.",
  },
  auto_ban: {
    title: 'Auto-Ban',
    text: 'Gork has an automated report system to prevent abuse. When Gork detects a violation, a strike is added to your record. Accumulating enough strikes within a rolling 30-day window results in an automatic ban.\n\nStrikes expire after 30 days. If you believe this was a mistake, contact a moderator.',
  },
  strike: {
    title: 'Strike System',
    text: "Gork has an automated moderation system to prevent abuse. When Gork detects content that violates community guidelines, it files a report and adds a strike to the user's record.\n\nStrikes expire after 30 days. Reach the strike threshold within that window and you will be automatically banned.",
  },
  optout: {
    title: 'Opt-Out',
    text: "This user asked Gork not to read their messages. Gork won't reply to them, and their messages show up only as a hidden placeholder when anyone else talks to Gork, in every channel and thread.\n\nThis is a privacy choice, not a ban. They can undo it with `/gork optin`, and admins can opt them back in.",
  },
  optin: {
    title: 'Opt-In',
    text: 'This user undid an earlier opt-out. Gork can read their messages and reply to them again.',
  },
  unban: {
    title: 'Unban',
    text: 'A moderator has reviewed this case and removed the ban. This user now has full access to Gork again.\n\nModerators can unban users at their discretion, for example if a ban was issued in error or after an appropriate cooldown period.',
  },
};

export async function execute({
  ack,
  action,
  body,
  client,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>> & AllMiddlewareArgs) {
  await ack();

  const info = MODAL_CONTENT[action.value ?? ''];
  if (!info) {
    return;
  }

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      title: { type: 'plain_text', text: info.title },
      close: { type: 'plain_text', text: 'Close' },
      blocks: asBlocks(Section({ text: info.text })),
    },
  });
}
