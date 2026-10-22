import { cn } from "@/lib/utils";
import { parentTheme as t } from "./theme";

interface ParentHeroProps {
  firstName?: string | null;
}

// The hand-lettered tagline and leaves appear only from 1360px wide, where there is room beside the children.

export function ParentHero({ firstName }: ParentHeroProps) {
  return (
    <section
      aria-labelledby="parent-welcome"
      className="relative isolate overflow-hidden rounded-[20px] border border-[#EFE8D8] bg-[#FBF6EC]"
    >
      <HeroBackdrop />

      <div className="relative z-10 flex min-h-[150px] flex-col justify-center px-6 py-7 sm:min-h-[170px] sm:px-7 md:min-h-[184px] md:max-w-[58%] xl:max-w-[55%]">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.24em] text-[#2C5FC4] sm:text-[13px]">
          Parent Portal
        </p>
        <h1
          id="parent-welcome"
          className={cn(
            "mt-1.5 text-[28px] font-extrabold leading-[1.12] tracking-[-0.01em] sm:text-[32px] xl:text-[38px] 2xl:text-[40px]",
            t.navy,
          )}
        >
          Welcome back
          {firstName ? (
            <>
              ,{" "}
              <span className="whitespace-nowrap">
                <span className="text-[#1C5AD6]">{firstName}!</span> <Wave />
              </span>
            </>
          ) : (
            <span className="whitespace-nowrap">
              ! <Wave />
            </span>
          )}
        </h1>
        <p className="mt-2 text-[15px] font-medium leading-snug text-[#5B6478] sm:text-[16px] xl:text-[17px]">
          Every small money habit is a step toward a brighter future.
        </p>
      </div>

      {/* Illustration column: never overlaps the text column */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] md:block xl:w-[45%]"
      >
        <WaterDrops />
        <img
          src="/images/admin-hero.png"
          alt=""
          draggable={false}
          className="absolute bottom-0 right-0 h-[94%] max-w-none select-none object-contain object-bottom xl:h-[108%] min-[1360px]:right-[132px]"
        />
        <Tagline />
      </div>
    </section>
  );
}

function Wave() {
  return (
    <span role="img" aria-label="waving hand">
      👋
    </span>
  );
}

function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Soft blue washes behind the children */}
      <div className="absolute -top-[55%] right-[6%] hidden h-[150%] w-[40%] rounded-full bg-[#DCE8F8] md:block" />
      <div className="absolute -top-[40%] right-[-6%] hidden h-[95%] w-[22%] rounded-full bg-[#E8EFFA] md:block" />
      {/* Warm yellow wash, bottom right */}
      <div className="absolute -bottom-[45%] -right-[4%] hidden h-[90%] w-[26%] rounded-full bg-[#FBEBC2]/80 md:block" />
    </div>
  );
}

function WaterDrops() {
  return (
    <svg className="absolute left-[1%] top-[24%] h-[38px] w-[44px]" viewBox="0 0 44 38">
      <path d="M14 2c5 8 10 14 10 20a10 10 0 0 1-20 0C4 16 9 10 14 2Z" fill="#8DB8EC" />
      <path d="M35 14c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12Z" fill="#B7D2F3" />
    </svg>
  );
}

function Tagline() {
  return (
    <div className="hidden min-[1360px]:block">
      {/* Yellow leaves above, green leaf below, between the children and the tagline */}
      <svg className="absolute right-[118px] top-[8%] h-[54px] w-[44px]" viewBox="0 0 44 54">
        <path d="M10 4c9 6 12 18 6 30C6 28 2 14 10 4Z" fill="#F5C24A" />
        <path d="M30 18c9 3 13 13 9 22-9-2-14-12-9-22Z" fill="#F7D47A" />
      </svg>
      <svg className="absolute bottom-[4%] right-[112px] h-[62px] w-[52px]" viewBox="0 0 52 62">
        <path d="M46 4C24 6 8 22 8 46c0 4 1 8 2 12 4-26 16-40 36-54Z" fill="#5DB98C" />
        <path d="M46 4c-2 26-14 44-34 52 8-16 18-32 34-52Z" fill="#7FCBA3" />
      </svg>

      <div className="absolute right-[18px] top-1/2 -translate-y-1/2">
        <p
          className="-rotate-[10deg] text-[25px] font-bold leading-[1.02] text-[#1F4FB5]"
          style={{ fontFamily: "'Caveat', 'Segoe Script', cursive" }}
        >
          Stronger
          <br />
          <span className="pl-3">Families</span>
          <br />
          <span className="pl-5">Brighter</span>
          <br />
          <span className="pl-8">Futures</span>
        </p>
        <svg className="absolute -right-3 -top-7 h-[42px] w-[44px]" viewBox="0 0 44 42" fill="none">
          <path
            d="M22 38S4 26 4 14C4 8 8 4 13 4c4 0 7 3 9 6 2-3 5-6 9-6 5 0 9 4 9 10 0 12-18 24-18 24Z"
            stroke="#F4BA46"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
