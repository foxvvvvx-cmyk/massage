export type ExtraPromptAppId =
    | "reading";

export type ExtraPromptAppDefinition = {
    id: ExtraPromptAppId;
    label: string;
    emptyText: string;
};

export const EXTRA_PROMPT_APPS: ExtraPromptAppDefinition[] = [
    { id: "reading", label: "阅读", emptyText: "选择角色、书籍、章节和任务后点击「预览」" },
];

export const EXTRA_PROMPT_APP_LABELS = Object.fromEntries(
    EXTRA_PROMPT_APPS.map((item) => [item.id, item.label]),
) as Record<ExtraPromptAppId, string>;
