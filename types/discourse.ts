/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The uploads from server
 *
 * @see createUpload
 * *Example:*
 *
 * ```json
 * {
 *     id: 2973,
 *     url: "https://discourse.example/uploads/default/original/2X/4/436ccd13b6e46397a792d51fbef445380b1cc1d3.jpeg",
 *     original_filename: "photo_2023-05-28_17-35-00.jpg",
 *     filesize: 122190,
 *     width: 640,
 *     height: 640,
 *     thumbnail_width: 500,
 *     thumbnail_height: 500,
 *     extension: jpeg,
 *     short_url: "upload://9Ct5W75p3SHRlq6I3TfD1OaFEdR.jpeg",
 *     short_path: "/uploads/short-url/9Ct5W75p3SHRlq6I3TfD1OaFEdR.jpeg",
 *     retain_hours: null,
 *     human_filesize: "119 KB",
 *     dominant_color: "67545B"
 * }
 * ```
 */
export interface Uploads {
  [propname: string]: unknown;
  /**
   * Uploads unique id
   */
  id: number;
  url: string;
  original_filename: string;
  filesize: number;
  width?: number;
  height?: number;
  thumbnail_width?: number;
  thumbnail_height?: number;
  /**
   * file extension
   */
  extension: string;
  short_url: string;
  short_path: string;
  retain_hours: number | null;
  human_filesize: string;
  dominant_color?: string | null;
}

/**
 * Post type
 */
export interface Post {
  [propname: string]: unknown;
  id: number;
  name: string | null;
  username: string;
  avatar_template: string;
  created_at: string;
  raw?: string;
  cooked: string;
  post_number: number;
  post_type: number;
  updated_at: string;
  reply_count: number;
  reply_to_post_number: string | null;
  quote_count: number;
  incoming_link_count: number;
  reads: number;
  readers_count: number;
  score: number;
  yours: boolean;
  topic_id: number;
  topic_slug: string;
  display_username: string | null;
  primary_group_name: string | null;
  flair_name: string | null;
  flair_url: string | null;
  flair_bg_color: string | null;
  flair_color: string | null;
  flair_group_id?: string | null;
  version: number;
  can_edit: boolean;
  can_delete: boolean;
  can_recover: boolean;
  can_see_hidden_post?: boolean;
  can_wiki: boolean;
  user_title: string | null;
  bookmarked: boolean;
  actions_summary: unknown[];
  moderator: boolean;
  admin: boolean;
  staff: boolean;
  user_id: number;
  draft_sequence: number;
  hidden: boolean;
  trust_level: number;
  deleted_at: string | null;
  user_deleted: boolean;
  edit_reason: string | null;
  can_view_edit_history: boolean;
  wiki: boolean;
  reviewable_id: string | null;
  reviewable_score_count: number;
  reviewable_score_pending_count: number;
  mentioned_users: unknown[];
}

export interface PostAction {
  [propname: string]: unknown;
  id: number;
  count: number;
  hidden: boolean;
  can_act: boolean;
}

export interface SuggestedTopic {
  [propname: string]: unknown;
  id: number;
  title: string;
  fancy_title: string;
  slug: string;
  posts_count: number;
  reply_count: number;
  highest_post_number: number;
  image_url: string;
  created_at: string;
  last_posted_at: string;
  bumped: boolean;
  bumped_at: string;
  archetype: string;
  unseen: boolean;
  pinned: boolean;
  unpinned: string;
  excerpt: string;
  visible: boolean;
  closed: boolean;
  archived: boolean;
  bookmarked: boolean;
  liked: string;
  tags: unknown[] | string[];
  tags_descriptions: unknown;
  like_count: number;
  views: number;
  category_id: number;
  featured_link: string;
  posters: {
    extras: string;
    description: string;
    user: {
      id: number;
      username: string;
      name: string;
      avatar_template: string;
    };
  }[];
}

/**
 * Topic
 */
export interface Topic extends BasicTopic {
  [propname: string]: unknown;
  post_stream: {
    posts: Post[];
    stream: number[];
  };
  timeline_lookup: unknown[];
  suggested_topics: SuggestedTopic[];
  tags: unknown[] | string[];
  tags_descriptions: unknown;
  id: number;
  title: string;
  fancy_title: string;
  posts_count: number;
  created_at: string;
  views: number;
  reply_count: number;
  like_count: number;
  last_posted_at: string;
  visible: boolean;
  closed: boolean;
  archived: boolean;
  has_summary: boolean;
  archetype: string;
  slug: string;
  category_id: number;
  word_count: number;
  deleted_at: string;
  user_id: number;
  featured_link: string;
  pinned_globally: boolean;
  pinned_at: string;
  pinned_until: string;
  image_url: string;
  slow_mode_seconds: number;
  draft: string;
  draft_key: string;
  draft_sequence: number;
  unpinned: string;
  pinned: boolean;
  current_post_number?: number;
  highest_post_number: number;
  deleted_by: string;
  has_deleted: boolean;
  actions_summary: PostAction[];
  chunk_size: number;
  bookmarked: boolean;
  bookmarks: unknown[];
  topic_timer: string;
  message_bus_last_id: number;
  participant_count: number;
  show_read_indicator: boolean;
  thumbnails: string;
  slow_mode_enabled_until: string;
  summarizable: boolean;
  details: {
    can_edit: boolean;
    notification_level: number;
    can_move_posts: boolean;
    can_delete: boolean;
    can_remove_allowed_users: boolean;
    can_create_post: boolean;
    can_reply_as_new_topic: boolean;
    can_invite_to?: boolean;
    can_invite_via_email?: boolean;
    can_flag_topic?: boolean;
    can_convert_topic: boolean;
    can_review_topic: boolean;
    can_close_topic: boolean;
    can_archive_topic: boolean;
    can_split_merge_topic: boolean;
    can_edit_staff_notes: boolean;
    can_toggle_topic_visibility: boolean;
    can_pin_unpin_topic: boolean;
    can_moderate_category: boolean;
    can_remove_self_id: number;
    participants?: (BasicUserExtendsFlair & { post_count: number })[];
    created_by: BasicUser;
    last_poster: BasicUser;
  };
}

export interface BasicUser {
  [propname: string]: unknown;
  id: number;
  username: string;
  name: string | null;
  avatar_template: string;
}

export interface BasicTopic {
  [propname: string]: unknown;
  id: number;
  title: string;
  fancy_title: string;
  slug: string;
  posts_count: number;
}

export interface Notification {
  [propname: string]: unknown;
  id?: number;
  user_id?: number;
  notification_type?: number;
  read?: boolean;
  created_at?: string;
  post_number?: string;
  topic_id?: number;
  fancy_title?: string;
  slug?: string;
  high_priority?: boolean;
  data?: {
    badge_id?: number;
    badge_name?: string;
    badge_slug?: string;
    badge_title?: boolean;
    username?: string;
  };
}
/**
 * @see {@link https://docs.discourse.org/#tag/Notifications/operation/getNotifications}
 */
export interface Notifications {
  [propname: string]: unknown;
  notifications?: Notification[];
  total_rows_notifications?: number;
  seen_notification_id?: number;
  load_more_notifications?: string;
}

/**
 * User info by getting `/u/username.json`
 * @see getUser
 */
export interface UserInfo {
  [propname: string]: unknown;
  user_badges: UserBadge[];
  badges?: BasicBadge[];
  badge_types?: BadgeType[];
  users?: BasicUserExtendsFlair[];
  topics?: BasicTopic[];
  user: User;
}

/**
 * User
 */
export interface User extends BasicUser {
  [propname: string]: unknown;
  id: number;
  username: string;
  name: string;
  avatar_template: string;
  /**
   * Shows if you get yourself
   */
  email?: string;
  /**
   * @todo Check the type
   */
  secondary_emails?: unknown[];
  /**
   * @todo Check the type
   */
  unconfirmed_emails?: unknown[];
  last_posted_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  ignored: boolean;
  muted: boolean;
  can_ignore_user: boolean;
  can_mute_user: boolean;
  can_send_private_messages: boolean;
  can_send_private_message_to_user: boolean;
  trust_level: number;
  /**
   * if the user is a moderator
   */
  moderator: boolean;
  /**
   * if the user is a admin
   */
  admin: boolean;
  title: string | null;
  badge_count: number;
  second_factor_backup_enabled?: boolean;
  user_fields?: UserField;
  custom_fields: UserCustomField;
  /**
   * User's reading time. Unit: seconds
   */
  time_read: number;
  /**
   * User's recent reading time. Unit: seconds
   */
  recent_time_read: number;
  primary_group_id: number | null;
  primary_group_name: string | null;
  flair_group_id: number | null;
  flair_name: string | null;
  flair_url: string | null;
  flair_bg_color: string | null;
  flair_color: string | null;
  featured_topic: string | null;
  pending_posts_count?: number;
  staged: boolean;
  status?: UserStatus;
  can_edit: boolean;
  can_edit_username: boolean;
  can_edit_email: boolean;
  can_edit_name: boolean;
  uploaded_avatar_id: number;
  has_title_badges: boolean;
  pending_count: number;
  profile_view_count: number;
  second_factor_enabled: boolean;
  can_upload_profile_header: boolean;
  can_upload_user_card_background: boolean;
  post_count: number;
  can_be_deleted: boolean;
  can_delete_all_posts: boolean;
  locale: string;
  muted_category_ids: number[];
  regular_category_ids: number[];
  watched_tags: string[];
  watching_first_post_tags: string[];
  tracked_tags: string[];
  muted_tags: string[];
  tracked_category_ids: number[];
  watched_category_ids: number[];
  watched_first_post_category_ids: number[];
  system_avatar_upload_id: string | null;
  system_avatar_template: string;
  muted_usernames: string[];
  ignored_usernames: string[];
  allowed_pm_usernames: string[];
  mailing_list_posts_per_day: number;
  can_change_bio: boolean;
  can_change_location: boolean;
  can_change_website: boolean;
  can_change_tracking_preferences: boolean;
  user_api_keys: UserApiKey[];
  user_auth_tokens: UserAuthToken[];
  user_notification_schedule: UserNotificationSchedule;
  use_logo_small_as_avatar: boolean;
  sidebar_tags?: UserSidebarTag[];
  sidebar_category_ids?: number[];
  display_sidebar_tags?: boolean;
  can_chat_user?: boolean;
  featured_user_badge_ids: number[];
  invited_by: string | null;
  groups: Group[];
  group_users: GroupUser[];
  user_option: UserOption;

  bio_excerpt?: string;
  website?: string;
  website_name?: string;
  location?: string;
  card_background_upload_url?: string;
  bio_raw?: string;
  bio_cooked?: string;
  gravatar_avatar_upload_id?: number;
  gravatar_avatar_template?: string;
  associated_accounts?: UserAssociatedAccount[];
  profile_background_upload_url?: string;
  custom_avatar_upload_id?: number;
  custom_avatar_template?: string;
}

export interface UserOption {
  [propname: string]: unknown;
  user_id: number;
  mailing_list_mode: boolean;
  mailing_list_mode_frequency: number;
  email_digests: boolean;
  email_level: number;
  email_messages_level: number;
  external_links_in_new_tab: boolean;
  bookmark_auto_delete_preference?: number;
  color_scheme_id: number | null;
  dark_scheme_id: number | null;
  dynamic_favicon: boolean;
  enable_quoting: boolean;
  enable_defer: boolean;
  digest_after_minutes: number;
  automatically_unpin_topics: boolean;
  auto_track_topics_after_msecs: number;
  notification_level_when_replying: number;
  new_topic_duration_minutes: number;
  email_previous_replies: number;
  email_in_reply_to: boolean;
  like_notification_frequency: number;
  include_tl0_in_digests: boolean;
  theme_ids: number[];
  theme_key_seq: number;
  allow_private_messages: boolean;
  enable_allowed_pm_users: boolean;
  homepage_id: string | null;
  hide_profile_and_presence: boolean;
  text_size: string;
  text_size_seq: number;
  title_count_mode: string;
  timezone: string | null;
  skip_new_user_tips: boolean;
  default_calendar?: string;
  oldest_search_log_date?: string | null;
  seen_popups?: unknown[] | null;
  sidebar_link_to_filtered_list?: boolean;
  sidebar_show_count_of_new_items?: boolean;
  watched_precedence_over_muted?: boolean | null;
  chat_enabled?: boolean;
  only_chat_push_notifications?: boolean | null;
  ignore_channel_wide_mention?: boolean | null;
  chat_email_frequency?: string;
  chat_header_indicator_preference?: string;
  chat_separate_sidebar_mode?: string;
}

export interface GroupUser {
  [propname: string]: unknown;
  group_id: number;
  user_id: number;
  notification_level: number;
  owner?: boolean;
}

export interface Group {
  [propname: string]: unknown;
  id: number;
  automatic: boolean;
  name: string;
  display_name: string;
  user_count: number;
  mentionable_level: number;
  messageable_level: number;
  visibility_level: number;
  primary_group: boolean;
  title: string | null;
  grant_trust_level: string | null;
  incoming_email: string | null;
  has_messages: boolean;
  flair_url: string | null;
  flair_bg_color: string | null;
  flair_color: string | null;
  bio_raw: string | null;
  bio_cooked: string | null;
  bio_excerpt: string | null;
  public_admission: boolean;
  public_exit: boolean;
  allow_membership_requests: boolean;
  full_name: string | null;
  default_notification_level: number;
  membership_request_template: string | null;
  members_visibility_level: number;
  can_see_members: boolean;
  can_admin_group: boolean;
  publish_read_state: boolean;
  custom_fields?: unknown;
}

export interface UserSidebarTag {
  [propname: string]: unknown;
  name: string;
  description: void /* 未知类型 */;
  pm_only: boolean;
}

export interface UserNotificationSchedule {
  [propname: string]: unknown;
  id: number;
  user_id: number;
  enabled: boolean;
  day_0_start_time: number;
  day_0_end_time: number;
  day_1_start_time: number;
  day_1_end_time: number;
  day_2_start_time: number;
  day_2_end_time: number;
  day_3_start_time: number;
  day_3_end_time: number;
  day_4_start_time: number;
  day_4_end_time: number;
  day_5_start_time: number;
  day_5_end_time: number;
  day_6_start_time: number;
  day_6_end_time: number;
}

export interface UserAuthToken {
  [propname: string]: unknown;
  id: number;
  client_ip?: string;
  location?: string;
  browser?: string;
  device?: string;
  os?: string;
  icon?: string;
  created_at?: string;
  seen_at?: string;
  is_active?: boolean;
}

export interface UserApiKey {
  [propname: string]: unknown;
  id: number;
  application_name: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
}

export interface UserAssociatedAccount {
  [propname: string]: unknown;
  name: string;
  description: string;
}

export interface UserStatus {
  [propname: string]: unknown;
  description: string;
  emoji: string;
  ends_at: string | null;
  message_bus_last_id?: number;
}

export type UserCustomField = Record<string, unknown>;

export type UserField = Record<string | number, string>;

export interface BasicUserExtendsFlair extends BasicUser {
  [propname: string]: unknown;
  id: number;
  username: string;
  name: string;
  avatar_template: string;
  primary_group_name?: string;
  flair_name?: string;
  flair_url?: string;
  flair_bg_color?: string;
  flair_color?: string;
  flair_group_id?: number;
  admin: boolean;
  moderator: boolean;
  trust_level: number;
}

export interface BadgeType {
  [propname: string]: unknown;
  id: number;
  name: string;
  sort_order: number;
}

export interface BasicBadge {
  [propname: string]: unknown;
  id: number;
  name: string;
  description: string;
  grant_count: number;
  allow_title: boolean;
  multiple_grant: boolean;
  icon: string;
  image_url: string | null;
  listable: boolean;
  enabled: boolean;
  badge_grouping_id: number;
  system: boolean;
  slug: string;
  manually_grantable: boolean;
  badge_type_id: number;
  i18n_name?: string;
}

export interface Badge extends BasicBadge {
  [propname: string]: unknown;
  query: string | null;
  trigger: number | null;
  target_posts: boolean;
  auto_revoke: boolean;
  show_posts: boolean;
}

export interface UserBadge {
  [propname: string]: unknown;
  id: number;
  granted_at: string;
  created_at: string;
  count: number;
  badge_id: number;
  user_id: number;
  granted_by_id: number;
}