export interface Species {
  id: string;
  name: string;
}

export const SPECIES_LIST: Species[] = [
  { id: 'maharashtra', name: 'Maharashtra' },
  { id: 'delhi', name: 'Delhi' },
  { id: 'karnataka', name: 'Karnataka' },
  { id: 'uttar-pradesh', name: 'Uttar Pradesh' },
  { id: 'tamil-nadu', name: 'Tamil Nadu' },
  { id: 'gujarat', name: 'Gujarat' },
  { id: 'west-bengal', name: 'West Bengal' },
  { id: 'rajasthan', name: 'Rajasthan' },
  { id: 'andhra-pradesh', name: 'Andhra Pradesh' },
  { id: 'telangana', name: 'Telangana' },
  { id: 'kerala', name: 'Kerala' },
  { id: 'punjab', name: 'Punjab' },
  { id: 'haryana', name: 'Haryana' },
  { id: 'madhya-pradesh', name: 'Madhya Pradesh' },
  { id: 'bihar', name: 'Bihar' },
  { id: 'odisha', name: 'Odisha' },
  { id: 'assam', name: 'Assam' },
  { id: 'jharkhand', name: 'Jharkhand' },
  { id: 'chhattisgarh', name: 'Chhattisgarh' },
  { id: 'uttarakhand', name: 'Uttarakhand' },
  { id: 'himachal-pradesh', name: 'Himachal Pradesh' },
  { id: 'goa', name: 'Goa' },
  { id: 'tripura', name: 'Tripura' },
  { id: 'jammu-kashmir', name: 'Jammu & Kashmir' },
  { id: 'chandigarh', name: 'Chandigarh' },
  { id: 'meghalaya', name: 'Meghalaya' },
  { id: 'manipur', name: 'Manipur' },
  { id: 'nagaland', name: 'Nagaland' }
];

export const EMOJIS = ['❤️', '👏', '😂', '👎', '💯', '✨', '🔥', '👀', '👍'];

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const SOCKET_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';
