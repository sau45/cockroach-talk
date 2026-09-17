/**
 * CockroachTalk - Application Configuration
 * File Responsibility: Single source of truth for app constants, state cockroach junction list, data URLs, and storage keys.
 */

export const CONFIG = {
  APP_NAME: 'CockroachTalk',
  TAGLINE: 'Live voice rooms. Every state has a cockroach room.',
  API_ROOMS_URL: './data/rooms.json',

  STORAGE_KEYS: {
    USER_PROFILE: 'cockroach_user_profile',
    THEME: 'cockroach_theme',
    FAVORITE_ROOMS: 'cockroach_favorite_rooms',
    AGE_CONSENT: 'cockroach_age_consent'
  },

  SPECIES_LIST: [
    { id: "maharashtra", name: "Maharashtra Cockroach" },
    { id: "delhi", name: "Delhi Cockroach" },
    { id: "karnataka", name: "Karnataka Cockroach" },
    { id: "uttar-pradesh", name: "Uttar Pradesh Cockroach" },
    { id: "tamil-nadu", name: "Tamil Nadu Cockroach" },
    { id: "gujarat", name: "Gujarat Cockroach" },
    { id: "west-bengal", name: "West Bengal Cockroach" },
    { id: "rajasthan", name: "Rajasthan Cockroach" },
    { id: "kerala", name: "Kerala Cockroach" },
    { id: "punjab", name: "Punjab Cockroach" },
    { id: "bihar", name: "Bihar Cockroach" },
    { id: "madhya-pradesh", name: "Madhya Pradesh Cockroach" },
    { id: "haryana", name: "Haryana Cockroach" },
    { id: "telangana", name: "Telangana Cockroach" },
    { id: "andhra-pradesh", name: "Andhra Pradesh Cockroach" },
    { id: "odisha", name: "Odisha Cockroach" },
    { id: "assam", name: "Assam Cockroach" },
    { id: "jharkhand", name: "Jharkhand Cockroach" },
    { id: "himachal-pradesh", name: "Himachal Pradesh Cockroach" },
    { id: "uttarakhand", name: "Uttarakhand Cockroach" },
    { id: "goa", name: "Goa Cockroach" },
    { id: "jammu-kashmir", name: "Jammu & Kashmir Cockroach" },
    { id: "chhattisgarh", name: "Chhattisgarh Cockroach" },
    { id: "puducherry", name: "Puducherry Cockroach" },
    { id: "chandigarh", name: "Chandigarh Cockroach" },
    { id: "ladakh", name: "Ladakh Cockroach" },
    { id: "sikkim", name: "Sikkim Cockroach" },
    { id: "tripura", name: "Tripura Cockroach" }
  ],

  GENDER_OPTIONS: [
    { value: 'male', label: 'Male', colorVar: '--male' },
    { value: 'female', label: 'Female', colorVar: '--female' },
    { value: 'skip', label: 'Prefer not to say', colorVar: '--accent-purple' }
  ],

  DEFAULT_THEME: 'dark'
};

export const SPECIES_LIST = CONFIG.SPECIES_LIST;
