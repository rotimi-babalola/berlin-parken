import { createPhotonProvider } from "./photon";

const providers = {
  photon: createPhotonProvider(),
};

export type GeocoderProviderName = keyof typeof providers;

export function getGeocoderProvider() {
  const name = process.env.GEOCODER_PROVIDER ?? "photon";
  if (!Object.hasOwn(providers, name)) throw new Error(`Unsupported geocoder provider: ${name}`);
  return providers[name as GeocoderProviderName];
}
