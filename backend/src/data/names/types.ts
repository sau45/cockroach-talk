export type GenderPreference = 'male' | 'female' | 'skip';

export interface RegionNamePool {
  region: string;
  firstNames: {
    male: string[];
    female: string[];
  };
  lastNames: string[];
}

