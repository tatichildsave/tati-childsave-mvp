import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { WELCOME_SPEECH } from "./roles";

function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices();
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return (
    english.find((voice) => voice.lang.toLowerCase().startsWith("en-gh")) ??
    english.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) ??
    english[0]
  );
}

/**
 * Reads a short welcome message aloud with the browser's speech synthesis.
 * If the browser has no speech support the button stays visible but disabled,
 * with an accessible explanation, instead of failing silently.
 */
export function ListenWelcomeButton({ className }: { className?: string }) {
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    return () => {
      // Stop only our own message when leaving the page.
      if (utteranceRef.current) synth.cancel();
    };
  }, []);

  function toggle() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(WELCOME_SPEECH);
    const voice = pickVoice(synth);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-GB";
    utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    setSpeaking(true);
    synth.speak(utterance);
  }

  const label = !supported
    ? "Listening is not available in this browser"
    : speaking
      ? "Stop reading the welcome message"
      : "Listen to a welcome message";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!supported}
      aria-label={label}
      aria-pressed={supported ? speaking : undefined}
      title={label}
      className={cn(
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full border border-[#e5e9fa] bg-[#f9faff] px-3 text-sm font-extrabold text-[#1b3a92]",
        "transition-colors hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4",
        speaking && "bg-[#e3ebff]",
        tatiTheme.focusRing,
        className,
      )}
    >
      {speaking ? (
        <Square aria-hidden="true" className="h-4 w-4 fill-current" />
      ) : (
        <Volume2 aria-hidden="true" className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">{speaking ? "Stop" : "Listen"}</span>
    </button>
  );
}
