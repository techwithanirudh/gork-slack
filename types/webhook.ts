import type { BasicChatMessage } from './chat';
import type { BasicUser, Uploads } from './discourse';

export interface WebhookPost {
  id: number;
  name: string | null;
  username: string;
  avatar_template: string;
  created_at: string;
  cooked: string;
  post_number: number;
  post_type: number;
  updated_at: string;
  reply_count: number;
  reply_to_post_number: number | null;
  quote_count: number;
  incoming_link_count: number;
  reads: number;
  score: number;
  topic_id: number;
  topic_slug: number;
  topic_title: string;
  category_id: number;
  display_username: string;
  primary_group_name: null | string;
  flair_name: null | string;
  flair_group_id: null | number;
  version: number;
  user_title: null | string;
  bookmarked?: boolean;
  raw: string;
  moderator: boolean;
  admin: boolean;
  staff: boolean;
  user_id: number;
  hidden: boolean;
  trust_level: 1;
  deleted_at: null | string;
  user_deleted: boolean;
  edit_reason: null | string;
  wiki: boolean;
  reviewable_id: null | number;
  reviewable_score_count: number;
  reviewable_score_pending_count: number;
  topic_posts_count: number;
  topic_filtered_posts_count: number;
  /**
   * @todo Don't know if it's private message
   */
  topic_archetype: 'regular' | string;
  category_slug: string;
}

export interface WebhookNotification {
  id: number;
  user_id?: number | null;
  notification_type: number;
  read: boolean;
  created_at: string;
  post_number: number | null;
  topic_id: number | null;
  fancy_title?: string;
  slug: string | null;
  data: Record<string, unknown>;
}

export interface WebhookChatMessage {
  message: {
    id: number;
    message: string;
    cooked: string;
    created_at: string;
    excerpt: string;
    chat_channel_id: string;
    deleted_at?: string;
    deleted_by_id?: number;
    mentioned_users: unknown[];
    available_flags: unknown[];
    user: {
      id: number;
      username: string;
      name: string | null;
      avatar_template: string;
      moderator: boolean;
      admin: boolean;
      staff: boolean;
      new_user: boolean;
      primary_group_name?: string;
      status?: {
        description: string;
        emoji: string;
        ends_at: null | string;
        message_bus_last_id?: number;
      };
    };
    chat_webhook_event: null | unknown;
    uploads: Uploads[];
    edited?: boolean;
    in_reply_to?: {
      id: number;
      cooked: string;
      excerpt: string;
      user: BasicUser;
      chat_webhook_event: null | unknown;
    };
  };
  channel: {
    id: number;
    allow_channel_wide_mentions: boolean;
    /**
     * The Chatable associated with the chat channel
     * @beta I don’t know if there will be `chatable` other than `"Category"`.
     * @todo add other `chatable` s
     */
    chatable: {
      id: number;
      name: string;
      color: string | null;
      text_color: string | null;
      slug: string;
      topic_count: number;
      post_count: number;
      position: number;
      description: string;
      description_text: string;
      description_excerpt: string;
      topic_url: string;
      read_restricted: boolean;
      permission: null | unknown;
      notification_level: null | unknown;
      topic_template: null | unknown;
      has_children: null | unknown;
      sort_order: null | unknown;
      sort_ascending: null | unknown;
      show_subcategory_list: boolean;
      num_featured_topics: number;
      default_view: null | unknown;
      subcategory_list_style: string;
      default_top_period: string;
      default_list_filter: string;
      minimum_required_tags: number;
      navigate_to_first_post_after_read: boolean;
      uploaded_logo: null | string;
      uploaded_logo_dark: null | string;
      uploaded_background: null | string;
    };
    chatable_id: number;
    chatable_type: 'Category' | string;
    chatable_url: string;
    description: string;
    title: string;
    slug: string;
    status: 'open' | string;
    memberships_count: number;
    current_user_membership: unknown;
    meta: unknown;
    threading_enabled: false;
    last_message: BasicChatMessage;
  };
}
