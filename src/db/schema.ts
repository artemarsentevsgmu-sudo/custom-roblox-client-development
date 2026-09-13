import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Active launcher sessions. The Roblox cookie is stored AES-256-GCM encrypted. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    robloxUserId: bigint("roblox_user_id", { mode: "number" }).notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    cookieEnc: text("cookie_enc").notNull(),
    loginMethod: text("login_method").notNull().default("cookie"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.robloxUserId)],
);

/** Short lived 2FA / challenge state so the password never travels back to the browser. */
export const loginChallenges = pgTable("login_challenges", {
  id: text("id").primaryKey(),
  cvalue: text("cvalue").notNull(),
  passwordEnc: text("password_enc").notNull(),
  challengeId: text("challenge_id"),
  innerChallengeId: text("inner_challenge_id"),
  robloxUserId: bigint("roblox_user_id", { mode: "number" }),
  mediaType: text("media_type").notNull().default("authenticator"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Recently launched experiences (per Roblox account). */
export const playHistory = pgTable(
  "play_history",
  {
    id: serial("id").primaryKey(),
    ownerUserId: bigint("owner_user_id", { mode: "number" }).notNull(),
    placeId: bigint("place_id", { mode: "number" }).notNull(),
    universeId: bigint("universe_id", { mode: "number" }),
    name: text("name").notNull(),
    thumbUrl: text("thumb_url"),
    serverId: text("server_id"),
    playedAt: timestamp("played_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("play_history_owner_idx").on(t.ownerUserId)],
);

/** Bookmarked game servers with the resolved host / region info. */
export const savedServers = pgTable(
  "saved_servers",
  {
    id: serial("id").primaryKey(),
    ownerUserId: bigint("owner_user_id", { mode: "number" }).notNull(),
    placeId: bigint("place_id", { mode: "number" }).notNull(),
    gameName: text("game_name").notNull(),
    serverId: text("server_id").notNull(),
    region: text("region"),
    host: text("host"),
    playing: integer("playing"),
    maxPlayers: integer("max_players"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("saved_servers_owner_idx").on(t.ownerUserId)],
);

/** Pinned groups shown on the dashboard. */
export const pinnedGroups = pgTable(
  "pinned_groups",
  {
    id: serial("id").primaryKey(),
    ownerUserId: bigint("owner_user_id", { mode: "number" }).notNull(),
    groupId: bigint("group_id", { mode: "number" }).notNull(),
    name: text("name").notNull(),
    memberCount: integer("member_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pinned_groups_owner_idx").on(t.ownerUserId)],
);

/** Per account launcher preferences. */
export const preferences = pgTable("preferences", {
  ownerUserId: bigint("owner_user_id", { mode: "number" }).primaryKey(),
  accent: text("accent").notNull().default("violet"),
  reduceMotion: boolean("reduce_motion").notNull().default(false),
  defaultServerSort: text("default_server_sort").notNull().default("ping"),
  autoRefreshServers: boolean("auto_refresh_servers").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Robux balance snapshots so the launcher can chart earnings over time. */
export const balanceSnapshots = pgTable(
  "balance_snapshots",
  {
    id: serial("id").primaryKey(),
    ownerUserId: bigint("owner_user_id", { mode: "number" }).notNull(),
    robux: integer("robux").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("balance_owner_idx").on(t.ownerUserId)],
);
