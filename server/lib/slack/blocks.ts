import type { KnownBlock } from '@slack/types';
import {
  type BlockBuilder,
  buildBlock,
  buildBlocks,
} from 'slack-block-builder';

export const asBlocks = (...builders: BlockBuilder[]): KnownBlock[] =>
  buildBlocks(...builders) as unknown as KnownBlock[];

export const asBlock = (builder: BlockBuilder): KnownBlock =>
  buildBlock(builder) as unknown as KnownBlock;
