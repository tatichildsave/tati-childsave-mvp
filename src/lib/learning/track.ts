import { saveTrack } from "@/content/tracks/save";
import { getLessonById } from "@/lib/lessons/registry";
import type { Assessment, Lesson, ReflectionPrompt, Scenario, Track, TrackItem } from "./types";

const TRACKS: Record<string, Track> = { [saveTrack.id]: saveTrack };

export function getTrack(trackId = "save"): Track {
  const track = TRACKS[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  return track;
}

export function getLesson(track: Track, id: string): Lesson | undefined {
  return track.lessons.find((l) => l.id === id);
}

export function getScenario(track: Track, id: string): Scenario | undefined {
  return track.scenarios.find((s) => s.id === id);
}

export function getAssessment(track: Track, id: string): Assessment | undefined {
  return track.assessments.find((a) => a.id === id);
}

export function getReflection(track: Track, id: string): ReflectionPrompt | undefined {
  return track.reflections?.find((r) => r.id === id);
}

export function itemTitle(track: Track, item: TrackItem): string {
  if (item.kind === "lesson")
    return getLessonById(item.id)?.title ?? getLesson(track, item.id)?.title ?? item.id;
  if (item.kind === "reflection") return getReflection(track, item.id)?.title ?? item.id;
  if (item.kind === "scenario")
    return item.chapterTitle ?? getScenario(track, item.id)?.title ?? item.id;
  return getAssessment(track, item.id)?.title ?? item.id;
}

export function itemSubtitle(track: Track, item: TrackItem): string {
  if (item.kind === "lesson") {
    const engineLesson = getLessonById(item.id);
    const minutes = engineLesson?.estimatedMinutes ?? getLesson(track, item.id)?.minutes ?? 5;
    const xp = engineLesson ? ` · +${engineLesson.xpReward} pts` : "";
    return `Lesson · ${minutes} min${xp}`;
  }
  if (item.kind === "reflection") return "Pause and think · 1 min";
  if (item.kind === "scenario") return item.chip ?? "Decision story";
  return getAssessment(track, item.id)?.phase === "pre" ? "Starting check-in" : "Final check-in";
}

/** Route path for a journey item. */
export function itemPath(childId: string, item: TrackItem): string {
  const base = `/learn/${childId}`;
  if (item.kind === "lesson") return `${base}/lesson/${item.id}`;
  if (item.kind === "reflection") return `${base}/reflection/${item.id}`;
  if (item.kind === "scenario") return `${base}/scenario/${item.id}`;
  return `${base}/assessment/${item.id}`;
}

/** Child-portal route for a journey item (child routes carry no childId segment). */
export function childItemPath(item: TrackItem): string {
  if (item.kind === "lesson") return `/child/lesson/${item.id}`;
  if (item.kind === "reflection") return `/child/reflection/${item.id}`;
  if (item.kind === "scenario") return `/child/scenario/${item.id}`;
  return `/child/assessment/${item.id}`;
}

export function nextItem(track: Track, item: TrackItem): TrackItem | undefined {
  const i = track.sequence.findIndex((s) => s.kind === item.kind && s.id === item.id);
  return i >= 0 ? track.sequence[i + 1] : undefined;
}
