import { DOUDIZHU_GAME_HTML, TRUTH_OR_DARE_GAME_HTML, SPICY_MONOPOLY_GAME_HTML } from "./game-builtin-html";
import type { GameTemplate } from "./game-types";

const now = "2026-06-06T00:00:00.000Z";

const EMPTY_PICKER_HTML = "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body></body></html>";

function template(input: Omit<GameTemplate, "playNote" | "authorId" | "authorName" | "authorAvatar" | "source" | "version" | "purchaseCount" | "rating" | "likeCount" | "favoriteCount" | "commentCount" | "createdAt" | "updatedAt"> & Partial<Pick<GameTemplate, "playNote" | "version">>): GameTemplate {
  return {
    ...input,
    playNote: input.playNote || "系统内置小游戏，可直接安装试玩。",
    authorId: "builtin",
    authorName: "系统内置",
    authorAvatar: "",
    source: "builtin",
    version: input.version ?? 1,
    purchaseCount: 0,
    rating: 5,
    likeCount: 0,
    favoriteCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export const GAME_BUILTIN_TEMPLATES: GameTemplate[] = [
  template({
    id: "builtin_game_doudizhu",
    title: "欢乐斗地主",
    codeName: "DOUDIZHU",
    subtitle: "AI 角色陪玩的经典牌局",
    synopsis: "选择小手机里的角色一起入座，叫地主、出牌、记牌，在一局斗地主里和角色自然互动。",
    playNote: "内置斗地主小游戏。游戏自带选人页，会读取可选角色、保存牌局进度，并可在关键节点写入小游戏记忆。",
    coverImage: "/game-covers/doudizhu.webp",
    tags: ["休闲", "互动"],
    roleSlots: [],
    pickerHtml: EMPTY_PICKER_HTML,
    gameHtml: DOUDIZHU_GAME_HTML,
    allowExternalControl: true,
  }),
  template({
    id: "builtin_game_truth_or_dare",
    title: "真心话大冒险",
    codeName: "TRUTH_OR_DARE",
    subtitle: "夜色派对问答互动",
    synopsis: "选择几位角色围坐一桌，让真心话和大冒险推动暧昧、玩笑、试探和临场反应。",
    playNote: "内置真心话大冒险小游戏。游戏自带选人页，会调用角色轻量包、生成题目和回应，并可记录本局重要事件。",
    coverImage: "/game-covers/truth-or-dare.webp",
    tags: ["剧情", "互动"],
    roleSlots: [],
    pickerHtml: EMPTY_PICKER_HTML,
    gameHtml: TRUTH_OR_DARE_GAME_HTML,
    allowExternalControl: true,
  }),
  template({
    id: "builtin_game_spicy_monopoly",
    title: "涩涩大富翁",
    codeName: "SPICY_MONOPOLY",
    subtitle: "双人棋盘 · 色色任务",
    synopsis: "两人轮流掷骰子，绕20格棋盘走，踩到不同格子做不同的色色任务。做任务赚金币，打满回合数后金币多的赢。内置安全词404、红线过滤、任务跳过/更换机制。",
    playNote: "通过 spicy-monopoly.lol 公开API驱动棋盘/任务/结算。支持角色选择/AI陪玩/404紧急停止/红线查看/跳过换题。需要联网。",
    coverImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='40%25'%3E%3Cstop offset='0%25' stop-color='%23e898a8'/%3E%3Cstop offset='100%25' stop-color='%231a0a14'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='200' height='200' rx='30' fill='url(%23g)'/%3E%3Ctext x='100' y='100' text-anchor='middle' fill='%23f1c45a' font-size='64' font-family='sans-serif'%3E🎲%3C/text%3E%3Ctext x='100' y='150' text-anchor='middle' fill='%23f5e8ee' font-size='16' font-family='sans-serif' font-weight='bold'%3E涩涩大富翁%3C/text%3E%3C/svg%3E",
    tags: ["互动", "剧情"],
    roleSlots: [],
    pickerHtml: EMPTY_PICKER_HTML,
    gameHtml: SPICY_MONOPOLY_GAME_HTML,
    allowExternalControl: true,
  }),
];

export function getGameBuiltinTemplate(id: string): GameTemplate | undefined {
  return GAME_BUILTIN_TEMPLATES.find(game => game.id === id);
}
