/** Shared guest-message formatting: commands in CAPS, stylized list markers. */

export const CMD = {
  help: "HELP",
  status: "STATUS",
  mission: "MISSION",
  drink: "DRINK",
  song: "SONG",
} as const;

export const BULLET = "▸ ";

export function commandList(lines: string[]): string {
  return lines.map((l) => `${BULLET}${l}`).join("\n");
}
