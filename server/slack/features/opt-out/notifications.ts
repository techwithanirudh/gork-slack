import type { WebClient } from '@slack/web-api';
import { Actions, Button, Context, Header, Section } from 'slack-block-builder';
import { asBlocks, slackDate } from '~/lib/slack/blocks';
import {
  footerBlock,
  infoButton,
  sendLog,
  sendReport,
} from '~/slack/features/reports/notifications/shared';

// Posts to the logs and reports channels, the same two places a ban goes.
export async function sendOptOutNotifications({
  client,
  userId,
  changedBy,
  optedOut,
}: {
  changedBy: string;
  client: WebClient;
  optedOut: boolean;
  userId: string;
}): Promise<void> {
  const ts = Math.floor(Date.now() / 1000);
  const title = optedOut ? 'Opt-Out' : 'Opt-In';
  const summary = optedOut
    ? "A user opted out of Gork. They can't use Gork, and their messages are hidden from it everywhere."
    : 'A user opted back in and can use Gork again.';
  const self = changedBy === userId;

  await Promise.all([
    sendLog(
      client,
      `${userId} ${optedOut ? 'opted out of' : 'opted back in to'} Gork`,
      [
        ...asBlocks(
          Header({ text: title }),
          Section({ text: summary }),
          Section().fields(`*User*\n<@${userId}>`)
        ),
        infoButton(optedOut ? 'optout' : 'optin'),
        footerBlock(ts),
      ]
    ),
    sendReport(
      client,
      `User <@${userId}> ${optedOut ? 'opted out of' : 'opted back in to'} Gork`,
      asBlocks(
        Header({ text: title }),
        Section({ text: summary }),
        Section().fields(
          `*User:*\n<@${userId}>`,
          `*${self ? 'By' : 'Changed By'}:*\n${self ? 'themselves' : `<@${changedBy}>`}`
        ),
        ...(optedOut
          ? [
              Actions().elements(
                Button({ text: 'Opt In User', actionId: 'opt_in_user' })
                  .primary()
                  .value(userId)
              ),
            ]
          : []),
        Context().elements(`${title} at ${slackDate()}`)
      )
    ),
  ]);
}
