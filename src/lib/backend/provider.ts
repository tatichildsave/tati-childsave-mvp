import type { BackendProviderName, TatiApplicationServices } from "./contracts";

export type BackendProviderFactory = () => TatiApplicationServices;

const factories = new Map<BackendProviderName, BackendProviderFactory>();
const availableProviders = new Set<BackendProviderName>(["supabase", "firebase"]);

/** Registers a provider without changing which provider the application uses. */
export function registerBackendProvider(
  name: BackendProviderName,
  factory: BackendProviderFactory,
): void {
  factories.set(name, factory);
}

/** Supabase remains the active provider until an explicit migration cutover. */
export function getActiveBackendProviderName(): BackendProviderName {
  return "supabase";
}

export function getAvailableBackendProviders(): readonly BackendProviderName[] {
  return [...availableProviders];
}

export function getBackendProvider(
  name: BackendProviderName = getActiveBackendProviderName(),
): TatiApplicationServices {
  const factory = factories.get(name);
  if (!factory) throw new Error(`Backend provider is not registered: ${name}`);
  return factory();
}
