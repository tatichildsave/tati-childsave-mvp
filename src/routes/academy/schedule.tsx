/**
 * TATI Academy — Class Schedule.
 *
 * Facilitators schedule classes for cohorts they own. Input is validated here
 * and enforced again by Firestore rules on academyClasses.
 */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Monitor, PlayCircle } from "lucide-react";
import { FacilitatorWorkspace } from "@/components/academy/FacilitatorWorkspace";
import { activityLabel } from "@/components/academy/FacilitatorDashboardSections";
import { getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";
import {
  CLASS_DELIVERY_OPTIONS,
  CLASS_DURATION_OPTIONS,
  CLASS_LOCATION_MAX,
  classActivityOptions,
  localDayKey,
  pastClasses,
  upcomingClasses,
  validateClassDraft,
  useCancelAcademyClass,
  useCreateAcademyClass,
  useFacilitatorClasses,
  useFacilitatorCohorts,
  type AcademyClass,
  type ClassDraft,
  type ClassDraftErrors,
} from "@/lib/academy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/academy/schedule")({
  head: () => ({
    meta: [
      { title: "Class Schedule — TATI Academy" },
      { name: "description", content: "Schedule and review classes for your TATI Academy cohorts." },
      { property: "og:title", content: "Class Schedule — TATI Academy" },
      { property: "og:description", content: "Schedule classes for your cohorts." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AcademySchedule,
});

const navy = "text-[#13215A]";
const muted = "text-[#6B7489]";
const card =
  "rounded-2xl border border-[#E4E9F2] bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04),0_4px_14px_rgba(16,24,64,0.04)]";
const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C5AD6] focus-visible:ring-offset-2";
const inputClass = cn(
  "h-12 w-full rounded-xl border border-[#D7DEEA] bg-white px-3.5 text-[15px] text-[#13215A] placeholder:text-[#9AA3B5]",
  "aria-[invalid=true]:border-[#D93636] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C5AD6]",
);
const primaryBtn = cn(
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#13306E] px-5 text-[15px] font-bold text-white transition-colors hover:bg-[#0E2658] disabled:cursor-not-allowed disabled:opacity-60",
  focus,
);
const smallBtn = cn(
  "inline-flex h-10 items-center justify-center rounded-lg px-3.5 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
  focus,
);

const ACTIVITY_OPTIONS = classActivityOptions();
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const EMPTY_DRAFT: ClassDraft = {
  cohortId: "",
  activityId: "",
  date: "",
  time: "",
  durationMinutes: 60,
  deliveryMode: "in-person",
  location: "",
};

function AcademySchedule() {
  const navigate = useNavigate();
  const [now] = useState(() => new Date());
  const [draft, setDraft] = useState<ClassDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<ClassDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });
  const uid = session?.uid ?? null;
  const cohortsQuery = useFacilitatorCohorts(uid);
  const classesQuery = useFacilitatorClasses(uid);
  const createClass = useCreateAcademyClass(uid);
  const cancelClass = useCancelAcademyClass(uid);

  useEffect(() => {
    if (!sessionLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [sessionLoading, session?.isFacilitator, navigate]);

  const cohorts = cohortsQuery.data ?? [];
  const activeCohorts = cohorts.filter((c) => c.status === "active");
  const cohortName = (id: string) => cohorts.find((c) => c.id === id)?.name ?? "Cohort";
  const classes = classesQuery.data ?? [];
  const upcoming = upcomingClasses(classes, now);
  const past = pastClasses(classes, now, 10);
  const today = localDayKey(now);
  const loading = sessionLoading || cohortsQuery.isLoading || classesQuery.isLoading;
  const loadFailed = cohortsQuery.isError || classesQuery.isError;

  function update<K extends keyof ClassDraft>(key: K, value: ClassDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const describe = (key: keyof ClassDraft) => (errors[key] ? `${key}-error` : undefined);
  const invalid = (key: keyof ClassDraft) => (errors[key] ? true : undefined);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSavedMessage(null);
    const { errors: nextErrors, scheduledAt } = validateClassDraft(
      draft,
      new Date(),
      new Set(activeCohorts.map((c) => c.id)),
    );
    setErrors(nextErrors);
    if (!scheduledAt) return;
    try {
      await createClass.mutateAsync({
        cohortId: draft.cohortId,
        activityId: draft.activityId,
        scheduledAt,
        durationMinutes: draft.durationMinutes,
        deliveryMode: draft.deliveryMode,
        location: draft.location,
      });
      setDraft((d) => ({ ...d, activityId: "", date: "", time: "", location: "" }));
      setSavedMessage("Class scheduled.");
    } catch {
      setFormError("We couldn't save this class. Check your connection and try again.");
    }
  }

  async function handleCancel(id: string) {
    setCancelError(null);
    try {
      await cancelClass.mutateAsync(id);
      setConfirmingId(null);
    } catch {
      setCancelError("We couldn't cancel that class. Try again.");
    }
  }

  const isVirtual = draft.deliveryMode === "virtual";

  return (
    <FacilitatorWorkspace active="schedule">
      <div className="space-y-4 sm:space-y-5">
        <header>
          <h1 className={cn("text-[26px] font-extrabold sm:text-[30px]", navy)}>Class Schedule</h1>
          <p className={cn("mt-1 text-[15px]", muted)}>Plan classes for your cohorts and see what is coming up.</p>
        </header>

        {loadFailed ? (
          <div className="rounded-2xl border border-[#F3D2D2] bg-[#FFF6F6] p-5" role="alert">
            <p className="text-[15px] font-extrabold text-[#B42318]">We couldn't load your schedule.</p>
            <p className={cn("mt-1 text-[14px]", muted)}>Check your connection, then refresh the page.</p>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-busy="true" aria-label="Loading schedule">
            <div className="h-96 animate-pulse rounded-2xl bg-[#EEF2F8]" />
            <div className="h-96 animate-pulse rounded-2xl bg-[#EEF2F8]" />
          </div>
        ) : !loadFailed ? (
          <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <section aria-labelledby="new-class-title" className={cn(card, "p-5 sm:p-6")}>
              <h2 id="new-class-title" className={cn("text-[18px] font-extrabold", navy)}>
                Schedule a class
              </h2>

              {activeCohorts.length === 0 ? (
                <div className="mt-4 rounded-xl bg-[#EEF4FD] p-4">
                  <p className={cn("text-[15px] font-extrabold", navy)}>You need an active cohort first</p>
                  <p className={cn("mt-1 text-[14px]", muted)}>Classes are scheduled for a cohort you run.</p>
                  <Link
                    to="/academy/cohorts"
                    search={{ view: "cohorts" }}
                    className={cn("mt-3 inline-flex text-[14px] font-bold text-[#1C5AD6] hover:underline", focus)}
                  >
                    Go to My Cohorts
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
                  <Field id="cohortId" label="Cohort" error={errors.cohortId}>
                    <select
                      id="cohortId"
                      value={draft.cohortId}
                      onChange={(e) => update("cohortId", e.target.value)}
                      aria-invalid={invalid("cohortId")}
                      aria-describedby={describe("cohortId")}
                      className={inputClass}
                    >
                      <option value="">Choose a cohort</option>
                      {activeCohorts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.learnerIds.length} {c.learnerIds.length === 1 ? "learner" : "learners"})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field id="activityId" label="Learning activity" error={errors.activityId}>
                    <select
                      id="activityId"
                      value={draft.activityId}
                      onChange={(e) => update("activityId", e.target.value)}
                      aria-invalid={invalid("activityId")}
                      aria-describedby={describe("activityId")}
                      className={inputClass}
                    >
                      <option value="">Choose an activity</option>
                      {ACTIVITY_OPTIONS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="date" label="Date" error={errors.date}>
                      <input
                        id="date"
                        type="date"
                        min={today}
                        value={draft.date}
                        onChange={(e) => update("date", e.target.value)}
                        aria-invalid={invalid("date")}
                        aria-describedby={describe("date")}
                        className={inputClass}
                      />
                    </Field>
                    <Field id="time" label="Start time" error={errors.time}>
                      <input
                        id="time"
                        type="time"
                        value={draft.time}
                        onChange={(e) => update("time", e.target.value)}
                        aria-invalid={invalid("time")}
                        aria-describedby={describe("time")}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="durationMinutes" label="Duration" error={errors.durationMinutes}>
                      <select
                        id="durationMinutes"
                        value={draft.durationMinutes}
                        onChange={(e) => update("durationMinutes", Number(e.target.value))}
                        aria-invalid={invalid("durationMinutes")}
                        aria-describedby={describe("durationMinutes")}
                        className={inputClass}
                      >
                        {CLASS_DURATION_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m} minutes
                          </option>
                        ))}
                      </select>
                    </Field>

                    <fieldset aria-describedby={describe("deliveryMode")} className="space-y-1.5">
                      <legend className={cn("text-[14px] font-bold", navy)}>Delivery</legend>
                      <div className="grid grid-cols-2 gap-3">
                        {CLASS_DELIVERY_OPTIONS.map((o) => {
                          const selected = draft.deliveryMode === o.value;
                          const Icon = o.value === "virtual" ? Monitor : MapPin;
                          return (
                            <label
                              key={o.value}
                              className={cn(
                                "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[15px] font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1C5AD6] has-[:focus-visible]:ring-offset-2",
                                selected
                                  ? "border-[#13306E] bg-[#EEF4FD] text-[#13306E]"
                                  : "border-[#D7DEEA] bg-white text-[#3D4766] hover:bg-[#F9FAFD]",
                              )}
                            >
                              <input
                                type="radio"
                                name="deliveryMode"
                                value={o.value}
                                checked={selected}
                                onChange={() => update("deliveryMode", o.value)}
                                className="sr-only"
                              />
                              <Icon className="h-4 w-4" aria-hidden />
                              {o.label}
                            </label>
                          );
                        })}
                      </div>
                      {errors.deliveryMode ? (
                        <p id="deliveryMode-error" className="text-[13px] font-semibold text-[#B42318]">
                          {errors.deliveryMode}
                        </p>
                      ) : null}
                    </fieldset>
                  </div>

                  <Field
                    id="location"
                    label={isVirtual ? "Meeting link or details" : "Venue"}
                    error={errors.location}
                  >
                    <input
                      id="location"
                      type="text"
                      maxLength={CLASS_LOCATION_MAX}
                      value={draft.location}
                      onChange={(e) => update("location", e.target.value)}
                      placeholder={isVirtual ? "https://…" : "e.g. Community centre, room 2"}
                      aria-invalid={invalid("location")}
                      aria-describedby={describe("location")}
                      className={inputClass}
                    />
                  </Field>

                  {formError ? (
                    <p role="alert" className="rounded-xl bg-[#FFF6F6] px-4 py-3 text-[14px] font-semibold text-[#B42318]">
                      {formError}
                    </p>
                  ) : null}
                  {savedMessage ? (
                    <p role="status" className="rounded-xl bg-[#EEF9F2] px-4 py-3 text-[14px] font-semibold text-[#17724F]">
                      {savedMessage}
                    </p>
                  ) : null}

                  <button type="submit" disabled={createClass.isPending} className={cn(primaryBtn, "w-full sm:w-auto")}>
                    <CalendarDays className="h-5 w-5" aria-hidden />
                    {createClass.isPending ? "Scheduling…" : "Schedule class"}
                  </button>
                </form>
              )}
            </section>

            <div className="space-y-4 sm:space-y-5">
              <section aria-labelledby="upcoming-classes-title" className={cn(card, "p-5 sm:p-6")}>
                <h2 id="upcoming-classes-title" className={cn("text-[18px] font-extrabold", navy)}>
                  Upcoming classes
                </h2>
                {cancelError ? (
                  <p role="alert" className="mt-3 rounded-xl bg-[#FFF6F6] px-4 py-3 text-[14px] font-semibold text-[#B42318]">
                    {cancelError}
                  </p>
                ) : null}

                {upcoming.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#D7DEEA] bg-[#F9FAFD] px-4 py-8 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-[#9AA3B5]" aria-hidden />
                    <p className={cn("mt-2 text-[14px] font-extrabold", navy)}>No upcoming classes</p>
                    <p className={cn("mt-0.5 text-[13px]", muted)}>Scheduled classes will be listed here.</p>
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-[#EEF1F6]">
                    {upcoming.map((item) => (
                      <ClassRow
                        key={item.id}
                        item={item}
                        cohortName={cohortName(item.cohortId)}
                        isToday={localDayKey(item.scheduledAt) === today}
                        actions={
                          confirmingId === item.id ? (
                            <>
                              <span className={cn("text-[14px] font-bold", navy)}>Cancel this class?</span>
                              <button
                                type="button"
                                onClick={() => void handleCancel(item.id)}
                                disabled={cancelClass.isPending}
                                className={cn(smallBtn, "bg-[#C63B3B] text-white hover:bg-[#A92F2F]")}
                              >
                                Yes, cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingId(null)}
                                className={cn(smallBtn, "bg-white text-[#13306E] ring-1 ring-[#D7DEEA] hover:bg-[#F4F8FF]")}
                              >
                                Keep class
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingId(item.id)}
                              className={cn(smallBtn, "bg-white text-[#C63B3B] ring-1 ring-[#F3D2D2] hover:bg-[#FFF6F6]")}
                            >
                              Cancel class
                            </button>
                          )
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="past-classes-title" className={cn(card, "p-5 sm:p-6")}>
                <h2 id="past-classes-title" className={cn("text-[18px] font-extrabold", navy)}>
                  Recent and cancelled
                </h2>
                {past.length === 0 ? (
                  <p className={cn("mt-3 text-[14px]", muted)}>Finished and cancelled classes will appear here.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-[#EEF1F6]">
                    {past.map((item) => (
                      <ClassRow key={item.id} item={item} cohortName={cohortName(item.cohortId)} isToday={false} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </FacilitatorWorkspace>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={cn("block text-[14px] font-bold", navy)}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-semibold text-[#B42318]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ClassRow({
  item,
  cohortName,
  isToday,
  actions,
}: {
  item: AcademyClass;
  cohortName: string;
  isToday: boolean;
  actions?: ReactNode;
}) {
  const start = item.scheduledAt;
  const end = new Date(start.getTime() + item.durationMinutes * 60_000);
  const ModeIcon = item.deliveryMode === "virtual" ? Monitor : MapPin;
  const cancelled = item.status === "cancelled";

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#1C5AD6]">{DATE_FORMAT.format(start)}</p>
          <p className={cn("mt-0.5 break-words text-[16px] font-extrabold", navy)}>{cohortName}</p>
        </div>
        {cancelled ? (
          <span className="rounded-full bg-[#FDE8E8] px-2.5 py-1 text-[12px] font-bold text-[#C63B3B]">Cancelled</span>
        ) : null}
      </div>

      <p className="mt-1 break-words text-[14px] text-[#3D4766]">{activityLabel(item.activityId)}</p>

      <ul className={cn("mt-2 grid gap-1.5 text-[13px] sm:grid-cols-2", muted)}>
        <li className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {TIME_FORMAT.format(start)}–{TIME_FORMAT.format(end)} · {item.durationMinutes} min
          </span>
        </li>
        <li className="flex min-w-0 items-start gap-2">
          <ModeIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">
            {item.deliveryMode === "virtual" ? "Virtual" : "In person"}
            {item.location ? `: ${item.location}` : ""}
          </span>
        </li>
      </ul>

      {!cancelled && (actions || isToday) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isToday ? (
            <Link
              to="/academy/session/start"
              search={{ activityId: item.activityId, cohortId: item.cohortId } as never}
              className={cn(smallBtn, "bg-[#13306E] text-white hover:bg-[#0E2658]")}
            >
              <PlayCircle className="mr-1.5 h-4 w-4" aria-hidden /> Start Session
            </Link>
          ) : null}
          {actions}
        </div>
      ) : null}
    </li>
  );
}
