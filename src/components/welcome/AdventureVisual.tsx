import kidsHero from "@/assets/tati-kids-hero.webp";

/**
 * The hero artwork: children photo card, floating Ghana cedi coins, an achievement
 * badge, a progress card and sparkles.
 *
 * The decorations are purely visual (aria-hidden) and show no real data. Everything is
 * positioned with percentages inside one fixed-aspect box so nothing overlaps the copy
 * or overflows horizontally on small screens. Float animations are disabled for
 * reduced-motion users through the shared `tati-float*` classes.
 */
export function AdventureVisual() {
  return (
    <div className="relative mx-auto h-[330px] w-full max-w-[360px] sm:h-[440px] sm:max-w-[600px] lg:h-[500px] lg:max-w-[600px]">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 -rotate-[17deg] rounded-full border-2 border-dashed border-[#c7dbff]/30"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 hidden h-[80%] w-[104%] -translate-x-1/2 -translate-y-1/2 rotate-[15deg] rounded-[50%] border-2 border-dashed border-[#c7dbff]/15 sm:block"
      />

      <figure className="absolute left-1/2 top-[15%] z-[2] aspect-[4/3] w-[84%] -translate-x-1/2 -rotate-[4deg] overflow-hidden rounded-[27px] border-[6px] border-white bg-[#ffb84b] shadow-[0_15px_0_var(--adventure-peach),0_25px_30px_rgb(5_17_61/0.45)] sm:w-[82%] sm:rounded-[40px] sm:border-[9px] sm:shadow-[0_24px_0_var(--adventure-peach),0_45px_50px_rgb(5_17_61/0.45)]">
        <img
          src={kidsHero}
          alt="Four happy children standing together on a sunny school campus in Ghana"
          width={1365}
          height={768}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#131d4c]/30 to-transparent"
        />
        <figcaption className="absolute bottom-2 left-[36%] text-xs font-black tracking-wide text-white [text-shadow:0_2px_5px_rgb(0_0_0/0.45)] sm:bottom-3 sm:left-[34%] sm:text-lg">
          YOUR ADVENTURE CREW <span aria-hidden="true">✦</span>
        </figcaption>
      </figure>

      <div
        aria-hidden="true"
        className="tati-coin tati-float absolute right-0 top-[4%] z-[3] h-[76px] w-[76px] rotate-[17deg] text-4xl sm:right-[1%] sm:h-[112px] sm:w-[112px] sm:border-[7px] sm:text-6xl"
      >
        ₵
      </div>
      <div
        aria-hidden="true"
        className="tati-coin tati-float-reverse absolute bottom-[4%] left-[3%] z-[3] h-11 w-11 -rotate-[13deg] text-xl sm:bottom-[7%] sm:left-[6%] sm:h-[64px] sm:w-[64px] sm:border-[6px] sm:text-3xl"
      >
        ₵
      </div>

      <div
        aria-hidden="true"
        className="tati-float-slow absolute left-0 top-[3%] z-[4] flex -rotate-[8deg] items-center gap-1.5 rounded-[14px] bg-white p-2 text-adventure-ink shadow-[0_19px_35px_rgb(8_26_108/0.4)] sm:left-[1%] sm:top-[6%] sm:gap-3 sm:rounded-[20px] sm:px-[18px] sm:py-[15px]"
      >
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[#fff0c1] text-xl sm:h-[50px] sm:w-[50px] sm:rounded-2xl sm:text-3xl">
          🏆
        </span>
        <span>
          <small className="block text-[8px] font-extrabold tracking-wider text-[#6b7390] sm:text-[10px]">
            ACHIEVEMENT UNLOCKED
          </small>
          <strong className="block text-[11px] font-black sm:text-base">Money Explorer</strong>
        </span>
      </div>

      <div
        aria-hidden="true"
        className="tati-float-reverse absolute -bottom-1 right-0 z-[4] w-[165px] rotate-[7deg] rounded-[14px] bg-white p-3 text-adventure-ink shadow-[0_18px_34px_rgb(8_26_108/0.42)] sm:bottom-0 sm:w-[232px] sm:rounded-[23px] sm:p-[18px]"
      >
        <div className="flex items-center justify-between gap-2">
          <strong className="text-[11px] font-black sm:text-sm">⭐ Level 01</strong>
          <span className="rounded-lg bg-[#e5fcf1] px-2 py-1 text-[9px] font-extrabold text-[#1f7f59] sm:text-[11px]">
            + 50 XP
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dfe7ff] sm:mt-3 sm:h-[9px]">
          <span className="block h-full w-[62%] rounded-full bg-[#6bdba6]" />
        </div>
        <p className="mt-1.5 text-[9px] font-extrabold text-[#5f6e90] sm:mt-2 sm:text-[11px]">
          You're on your way!
        </p>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-[18%] left-0 z-[4] -rotate-[7deg] rounded-xl bg-adventure-pink px-3 py-2 text-[10px] font-black text-[#3a1246] shadow-[0_5px_0_var(--adventure-pink-deep)] sm:bottom-[16%] sm:px-[23px] sm:py-[13px] sm:text-sm sm:shadow-[0_9px_0_var(--adventure-pink-deep)]"
      >
        ✦ LET'S LEVEL UP!
      </div>

      <span
        aria-hidden="true"
        className="absolute right-0 top-[33%] z-[3] text-2xl text-[#ffd556] sm:-right-2 sm:text-[40px]"
      >
        ✴
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-[14%] left-[16%] z-[3] text-2xl text-[#9dfbc0] sm:left-[3%] sm:text-[40px]"
      >
        ✳
      </span>
    </div>
  );
}
