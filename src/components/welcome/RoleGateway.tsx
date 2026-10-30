import { RoleCard } from "./RoleCard";
import { WELCOME_ROLES } from "./roles";

/** The "Choose your entrance" panel that overlaps the bottom of the hero. */
export function RoleGateway() {
  return (
    <section
      id="choose"
      aria-labelledby="gateway-heading"
      className="relative z-10 scroll-mt-4 px-4 pb-6 sm:px-8 lg:px-12"
    >
      <div className="mx-auto -mt-9 w-full max-w-[1300px] rounded-[26px] border border-[#e8ecfb] bg-white p-3.5 shadow-[0_20px_48px_rgb(11_30_98/0.13)] sm:rounded-[29px] sm:p-6">
        <div className="mb-3.5 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-adventure-blue">
              <span aria-hidden="true">✨ </span>Your way in
            </p>
            <h2
              id="gateway-heading"
              className="mt-1 text-[1.4rem] font-extrabold leading-tight tracking-tight text-adventure-ink sm:text-[1.6rem]"
            >
              Choose your entrance <span className="text-adventure-sun-deep">✦</span>
            </h2>
          </div>
          <p className="hidden text-sm font-bold text-adventure-muted lg:block">
            Already part of TATI? Head straight to your space.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-[1.2fr_1.2fr_1fr_1fr]">
          {WELCOME_ROLES.map((role) => (
            <li key={role.id} className="flex">
              <RoleCard role={role} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
