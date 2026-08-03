import type { CustomAppIconId } from "@/lib/custom-app-types";

export type IconId =
  | "chat"
  | "music"
  | "reading"
  | "story"
  | "game"
  | "appmarket"
  | "xiaohongshu"
  | "shopping"
  | "calendar"
  | "moments"
  | "group_chat"
  | "settings"
  | "theme"
  | "resources"
  | "characters";

export type DesktopIconId = IconId | CustomAppIconId;

export type IconPosition = { id: DesktopIconId; row: number; col: number };

export type IconMeta = {
  id: IconId;
  label: string;
  tone: string;
  placeholder: boolean;
  path?: string;
};

export const PAGE_1_DEFAULT: IconId[] = ["chat", "music", "calendar", "shopping", "reading"];

export const PAGE_2_DEFAULT: IconId[] = [
  "game",
  "appmarket",
  "xiaohongshu",
  "story"
];

export const DOCK_DEFAULT: IconId[] = ["settings", "theme", "resources", "characters"];

export const ICONS: Record<IconId, IconMeta> = {
  chat: { id: "chat", label: "聊天", tone: "var(--c-icon-green)", placeholder: false },
  music: { id: "music", label: "音乐", tone: "var(--c-icon-coral)", placeholder: false },
  reading: { id: "reading", label: "阅读", tone: "var(--c-icon-amber)", placeholder: false },
  story: { id: "story", label: "剧情", tone: "var(--c-icon-story, #8b6f52)", placeholder: false },
  game: { id: "game", label: "游戏", tone: "var(--c-icon-blue)", placeholder: false },
  appmarket: { id: "appmarket", label: "应用市场", tone: "var(--c-icon-teal)", placeholder: false },
  xiaohongshu: {
    id: "xiaohongshu",
    label: "小红书",
    tone: "var(--c-icon-rose)",
    placeholder: false
  },
  shopping: { id: "shopping", label: "购物", tone: "var(--c-icon-amber)", placeholder: false },
  calendar: { id: "calendar", label: "日历", tone: "var(--c-icon-rose)", placeholder: true },
  moments: { id: "moments", label: "朋友圈", tone: "var(--c-icon-lilac)", placeholder: false },
  group_chat: { id: "group_chat", label: "群聊", tone: "var(--c-icon-teal)", placeholder: false },
  settings: { id: "settings", label: "设置", tone: "var(--c-icon-slate)", placeholder: false },
  theme: { id: "theme", label: "主题", tone: "var(--c-icon-violet)", placeholder: true },
  resources: { id: "resources", label: "资源库", tone: "var(--c-icon-teal)", placeholder: false },
  characters: {
    id: "characters",
    label: "角色",
    tone: "var(--c-icon-lilac)",
    placeholder: false,
    path: "/characters"
  },
};
