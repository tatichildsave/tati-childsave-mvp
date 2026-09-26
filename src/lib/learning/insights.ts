import type { ProgressEvent } from "./progress";
import type { Track } from "./types";

/** Plain-language insights for the parent dashboard and learning summary. */
export function buildInsights(track: Track, events: ProgressEvent[]): string[] {
  const out: string[] = [];
  const pre = events.find((e) => e.item_type === "assessment" && e.item_id === "save-pre");
  const post = events.find((e) => e.item_type === "assessment" && e.item_id === "save-post");
  const lessons = events.filter((e) => e.item_type === "lesson").length;
  const scenarios = events.filter((e) => e.item_type === "scenario");

  if (!pre) {
    out.push("Not started yet — the first check-in takes about three minutes.");
    return out;
  }

  out.push(`Starting check-in: ${pre.score}/${pre.max_score} saving-minded answers.`);
  out.push(`${lessons} of ${track.lessons.length} lessons finished.`);

  if (scenarios.length > 0) {
    const kept = scenarios.reduce(
      (sum, s) => sum + Number((s.details as { finalSavings?: number }).finalSavings ?? 0),
      0,
    );
    out.push(
      `Decision stories completed: ${scenarios.length}. Money kept across stories: GH₵${kept}.`,
    );
  }

  if (post && pre.score !== null && post.score !== null) {
    const diff = post.score - pre.score;
    out.push(
      diff > 0
        ? `Final check-in improved by ${diff} answer${diff === 1 ? "" : "s"} — talk about what changed.`
        : diff === 0
          ? "Final check-in matched the first one. A good moment to practise together."
          : "Final check-in was lower than the first. Worth revisiting the lessons side by side.",
    );
  }

  out.push("Talk at home: ask what they are saving for and how many weeks it will take.");
  return out;
}
