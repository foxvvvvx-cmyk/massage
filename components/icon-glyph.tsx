import type { IconId } from "@/lib/desktop-config";
import {
  mdiCogOutline,
  mdiMessageProcessing,
  mdiMusic,
  mdiBookOpenVariant,
  mdiMovie,
  mdiGamepadVariant,
  mdiPackageVariant,
  mdiShopping,
  mdiCalendarMonth,
  mdiAccountGroup,
  mdiPalette,
  mdiDatabase,
  mdiAccount,
} from "@mdi/js";

type IconGlyphProps = {
  id: IconId;
  className?: string;
};

const MDI_PATHS: Record<IconId, string> = {
  settings: mdiCogOutline,
  chat: mdiMessageProcessing,
  music: mdiMusic,
  reading: mdiBookOpenVariant,
  story: mdiMovie,
  game: mdiGamepadVariant,
  xiaohongshu: mdiPackageVariant,
  shopping: mdiShopping,
  calendar: mdiCalendarMonth,
  group_chat: mdiAccountGroup,
  theme: mdiPalette,
  resources: mdiDatabase,
  characters: mdiAccount,
};

export function IconGlyph({ id, className }: IconGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        d={MDI_PATHS[id] || "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"}
        fill="var(--c-desktop-icon, #ffffff)"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
      />
    </svg>
  );
}

