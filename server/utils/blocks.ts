import type {
  AnyBlock,
  RichTextBlock,
  RichTextSection,
  RichTextUsergroupMention,
} from '@slack/types';

export function getGroupMentions(blocks?: AnyBlock[]): string[] {
  if (!blocks) {
    return [];
  }
  return blocks
    .filter((b): b is RichTextBlock => b.type === 'rich_text')
    .flatMap((b) => b.elements)
    .filter((s): s is RichTextSection => s.type === 'rich_text_section')
    .flatMap((s) => s.elements)
    .filter((e): e is RichTextUsergroupMention => e.type === 'usergroup')
    .map((e) => e.usergroup_id);
}
