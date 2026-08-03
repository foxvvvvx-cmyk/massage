import { syncChatGeneratedImagePromptText, updateChatMessage, type ChatMessage } from "./chat-storage";
import { generatedImageFilename, generateImageFromConfiguredApi } from "./image-generation-service";

function errorToMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function dispatchChatMessagesUpdated(sessionId: string, message: ChatMessage): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("chat-messages-updated", {
        detail: { sessionId, message },
    }));
}

export function createPendingChatGeneratedImageData(
    mediaData: ChatMessage["mediaData"] | undefined,
    description?: string,
): ChatMessage["mediaData"] {
    const label = (description || mediaData?.label || "").trim();
    return {
        ...mediaData,
        label,
        imageGenerationStatus: "pending",
        imageGenerationError: undefined,
    };
}

export function isPendingChatGeneratedImageMessage(message: Pick<ChatMessage, "mediaType" | "mediaData">): boolean {
    return message.mediaType === "image" && message.mediaData?.imageGenerationStatus === "pending";
}

export async function generateAndApplyChatGeneratedImage(
    message: ChatMessage,
    characterId?: string,
    options?: { signal?: AbortSignal; description?: string },
): Promise<ChatMessage> {
    const previousDescription = message.mediaData?.label?.trim() || "";
    const description = (options?.description ?? previousDescription).trim();
    if (!description) throw new Error("缺少图片描述，无法重新生成");
    if (previousDescription && previousDescription !== description) {
        syncChatGeneratedImagePromptText(message.id, previousDescription, description);
    }

    try {
        const generated = await generateImageFromConfiguredApi({
            description,
            characterId,
            useReferenceImage: message.mediaData?.useReferenceImage === true,
            signal: options?.signal,
        });
        if (!generated) throw new Error("生图配置未启用或不完整");

        const fileName = generatedImageFilename(description, generated.mimeType);
        const previousData = message.mediaData ?? {};
        const nextData: ChatMessage["mediaData"] = {
            ...previousData,
            label: description,
            fileType: "image",
            fileName,
            imageGenerationMediaRef: generated.mediaRef,
            imageGenerationPrompt: generated.prompt,
            imageGenerationUsedReference: generated.usedReferenceImage,
            imageGenerationStatus: "generated",
            imageGenerationError: undefined,
        };
        const updated = updateChatMessage(message.id, {
            content: fileName,
            mediaType: "media_file",
            mediaUrl: generated.dataUrl,
            mediaData: nextData,
        });
        if (!updated) throw new Error("原消息不存在，无法替换图片");
        dispatchChatMessagesUpdated(updated.sessionId, updated);
        return updated;
    } catch (error) {
        const failed = updateChatMessage(message.id, {
            mediaData: {
                ...message.mediaData,
                label: description,
                imageGenerationStatus: "failed",
                imageGenerationError: errorToMessage(error),
            },
        });
        if (failed) dispatchChatMessagesUpdated(failed.sessionId, failed);
        throw error;
    }
}

export async function retryChatGeneratedImage(
    message: ChatMessage,
    characterId?: string,
    nextDescription?: string,
): Promise<ChatMessage> {
    return generateAndApplyChatGeneratedImage(message, characterId, { description: nextDescription });
}
