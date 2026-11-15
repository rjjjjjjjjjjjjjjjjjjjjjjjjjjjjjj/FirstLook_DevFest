// In-memory only: an unfinished medical draft must not persist on a shared device.
export type ScreeningDraft = { photo: string | null; description: string };
let draft: ScreeningDraft | null = null;
export function setScreeningDraft(value: ScreeningDraft) { draft = value; }
export function takeScreeningDraft() { const value = draft; draft = null; return value; }
