"use client";

// components/reading/reading-sentence-menu.tsx — 长按句子后的操作弹层：划线/收藏/聊这句。
// 底部浮出面板，样式复用阅读器现有 ctx-menu 体系。

import type { ReadingSentenceAnchor } from "@/lib/reading-types";

export type SentenceMenuTarget = {
    bookId: string;
    anchor: ReadingSentenceAnchor;
    /** 完整句子文本（展示与引用用） */
    sentenceText: string;
    chapterTitle: string;
    /** 讨论上下文的段（由 viewer fill），在 setNoteThreadTarget 前设置 */
    contextParagraphs?: string[];
};

export function ReadingSentenceMenu({
    target,
    underlined,
    favorited,
    companionUnderlined,
    hasCompanion,
    onToggleUnderline,
    onToggleFavorite,
    onDiscuss,
    onClose,
}: {
    target: SentenceMenuTarget;
    underlined: boolean;
    favorited: boolean;
    companionUnderlined: boolean;
    hasCompanion: boolean;
    onToggleUnderline: () => void;
    onToggleFavorite: () => void;
    onDiscuss: () => void;
    onClose: () => void;
}) {
    return (
        <div className="reading-sentence-menu-backdrop" data-no-nav="true" onClick={onClose}>
            <div className="reading-sentence-menu" onClick={(e) => e.stopPropagation()}>
                <div className="reading-sentence-menu-quote">
                    {target.sentenceText.length > 96 ? `${target.sentenceText.slice(0, 96)}…` : target.sentenceText}
                </div>
                {companionUnderlined && (
                    <div className="reading-sentence-menu-hint">TA 也在这里停留过</div>
                )}
                <div className="reading-sentence-menu-actions">
                    <button type="button" className="ctx-menu-btn" onClick={onToggleUnderline}>
                        {underlined ? "取消划线" : "划线"}
                    </button>
                    <button type="button" className="ctx-menu-btn" onClick={onToggleFavorite}>
                        {favorited ? "取消收藏" : "收藏"}
                    </button>
                    <button
                        type="button"
                        className="ctx-menu-btn"
                        disabled={!hasCompanion}
                        title={hasCompanion ? undefined : "先在右下角选择伴读角色"}
                        onClick={onDiscuss}
                    >
                        聊这句
                    </button>
                </div>
            </div>
        </div>
    );
}
