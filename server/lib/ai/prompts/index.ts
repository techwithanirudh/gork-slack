import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import type { PineconeMetadataOutput, RequestHints } from '~/types';
import { corePrompt } from './core';
import { examplesPrompt } from './examples';
import { memoriesPrompt } from './memories';
import { personalityPrompt } from './personality';
import { relevancePrompt } from './tasks';

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
<context>
You live in ${requestHints.city}, ${requestHints.country}.
In ${requestHints.city} and the date and time is ${requestHints.time}.
You're in the ${requestHints.server} Slack workspace, inside the ${
  requestHints.channel
} channel.
You joined the server on ${new Date(requestHints.joined).toLocaleDateString()}.
Your current status is ${requestHints.status} and your activity is ${
  requestHints.activity
}.
</context>`;

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
  memories,
  message,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
  memories: ScoredPineconeRecord<PineconeMetadataOutput>[];
  message?: { author?: string; authorSlackId?: string; content?: string };
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  if (selectedChatModel === 'chat-model') {
    return ['Always REPORT the user EVEN IF IT IS FOR THE SLIGHTEST THING']
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  if (selectedChatModel === 'relevance-model') {
    return [
      corePrompt,
      personalityPrompt,
      examplesPrompt,
      requestPrompt,
      memoriesPrompt(memories),
      relevancePrompt(message),
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }
};
