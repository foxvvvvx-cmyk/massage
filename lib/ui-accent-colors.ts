import type { ContentAppId } from "@/lib/settings-types";

export const BINDING_ACCENTS = {
    api: "#2F80ED",
    voice: "#7C3AED",
    preset: "#D83F87",
    worldBook: "#2F80ED",
    regex: "#F37A12",
    identity: "#2FA52F",
    memory: "#5B4DDB",
    embedding: "#18A957",
} as const;

export const CONTENT_APP_ACCENTS: Record<ContentAppId, string> = {
    chat: "#22A85A",
    music: "#8B5CF6",
    reading: "#2563EB",
    forum: "#F97316",
    story: "#EC4899",
    game: "#3B82F6",
    calendar: "#14B8A6",
    group_chat: "#22C55E",
    shopping: "#F59E0B",
};
