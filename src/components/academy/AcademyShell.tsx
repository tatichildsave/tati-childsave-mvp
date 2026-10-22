import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { FacilitatorWorkspace, type FacilitatorSection } from "./FacilitatorWorkspace";

function sectionForPath(pathname: string): FacilitatorSection {
  if (pathname.startsWith("/academy/cohorts")) return "cohorts";
  if (pathname.startsWith("/academy/session/start") || pathname.startsWith("/academy/session/monitor")) {
    return "start";
  }
  if (pathname.startsWith("/academy/session")) return "guide";
  if (pathname.startsWith("/academy/profile")) return "profile";
  return "dashboard";
}

/** Academy page chrome. Delegates to FacilitatorWorkspace and highlights the nav item for the current URL. */
export function AcademyShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <FacilitatorWorkspace active={sectionForPath(pathname)}>{children}</FacilitatorWorkspace>;
}
