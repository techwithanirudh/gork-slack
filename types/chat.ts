import type { Uploads } from './discourse';

export interface BasicChatMessage {
  id: number;
  message: string;
  cooked: string;
  created_at: string;
  edited?: boolean;
  excerpt: string;
  deleted_at?: null | string;
  deleted_by_id?: null | number;
  thread_id?: null | number;
  chat_channel_id: number;
}

export type ChatMessageOptions = {
  /**
   * Reply to message id
   */
  in_reply_to_id?: number;
  /**
   * An array of uploads_ids
   */
  uploads?: Uploads[] | { id: number }[] | number[];
};
