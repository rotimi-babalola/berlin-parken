export type AddressSuggestion = {
  id: string;
  label: string;
  detail: string;
  latitude: number;
  longitude: number;
};

export interface GeocoderProvider {
  suggest(query: string): Promise<AddressSuggestion[]>;
}
