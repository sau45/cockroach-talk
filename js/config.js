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
    { id: "maharashtra", name: "Maharashtra" },
    { id: "delhi", name: "Delhi" },
    { id: "karnataka", name: "Karnataka" },
    { id: "uttar-pradesh", name: "Uttar Pradesh" },
    { id: "tamil-nadu", name: "Tamil Nadu" },
    { id: "gujarat", name: "Gujarat" },
    { id: "west-bengal", name: "West Bengal" },
    { id: "rajasthan", name: "Rajasthan" },
    { id: "andhra-pradesh", name: "Andhra Pradesh" },
    { id: "telangana", name: "Telangana" },
    { id: "kerala", name: "Kerala" },
    { id: "punjab", name: "Punjab" },
    { id: "haryana", name: "Haryana" },
    { id: "madhya-pradesh", name: "Madhya Pradesh" },
    { id: "bihar", name: "Bihar" },
    { id: "odisha", name: "Odisha" },
    { id: "assam", name: "Assam" },
    { id: "jharkhand", name: "Jharkhand" },
    { id: "chhattisgarh", name: "Chhattisgarh" },
    { id: "uttarakhand", name: "Uttarakhand" },
    { id: "himachal-pradesh", name: "Himachal Pradesh" },
    { id: "goa", name: "Goa" },
    { id: "tripura", name: "Tripura" },
    { id: "jammu-kashmir", name: "Jammu & Kashmir" },
    { id: "chandigarh", name: "Chandigarh" },
    { id: "meghalaya", name: "Meghalaya" },
    { id: "manipur", name: "Manipur" },
    { id: "nagaland", name: "Nagaland" }
  ],

  GENDER_OPTIONS: [
    { value: 'male', label: 'Male', colorVar: '--male' },
    { value: 'female', label: 'Female', colorVar: '--female' },
    { value: 'skip', label: 'Prefer not to say', colorVar: '--accent-purple' }
  ],

  DEFAULT_THEME: 'dark'
};

export const SPECIES_LIST = CONFIG.SPECIES_LIST;
