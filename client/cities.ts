import type { Difficulty } from './cityScoring'

export interface City {
  id: string
  name: string
  lat: number
  lng: number
  difficulty: Difficulty
  countryCode: string      // ISO 3166-1 alpha-3 (world mode boundary filter)
  stateName?: string       // Full US state name (US mode boundary filter)
}

export const worldCities: City[] = [
  // Easy — major world capitals and metros
  { id: 'london',       name: 'London',        lat: 51.5074,  lng: -0.1278,   difficulty: 'easy',     countryCode: 'GBR' },
  { id: 'paris',        name: 'Paris',         lat: 48.8566,  lng: 2.3522,    difficulty: 'easy',     countryCode: 'FRA' },
  { id: 'tokyo',        name: 'Tokyo',         lat: 35.6762,  lng: 139.6503,  difficulty: 'easy',     countryCode: 'JPN' },
  { id: 'new-york',     name: 'New York',      lat: 40.7128,  lng: -74.006,   difficulty: 'easy',     countryCode: 'USA' },
  { id: 'sydney',       name: 'Sydney',        lat: -33.8688, lng: 151.2093,  difficulty: 'easy',     countryCode: 'AUS' },
  { id: 'moscow',       name: 'Moscow',        lat: 55.7558,  lng: 37.6173,   difficulty: 'easy',     countryCode: 'RUS' },
  { id: 'beijing',      name: 'Beijing',       lat: 39.9042,  lng: 116.4074,  difficulty: 'easy',     countryCode: 'CHN' },
  { id: 'cairo',        name: 'Cairo',         lat: 30.0444,  lng: 31.2357,   difficulty: 'easy',     countryCode: 'EGY' },
  { id: 'rio',          name: 'Rio de Janeiro',lat: -22.9068, lng: -43.1729,  difficulty: 'easy',     countryCode: 'BRA' },
  { id: 'toronto',      name: 'Toronto',       lat: 43.6532,  lng: -79.3832,  difficulty: 'easy',     countryCode: 'CAN' },
  { id: 'cape-town',    name: 'Cape Town',     lat: -33.9249, lng: 18.4241,   difficulty: 'easy',     countryCode: 'ZAF' },
  { id: 'mexico-city',  name: 'Mexico City',   lat: 19.4326,  lng: -99.1332,  difficulty: 'easy',     countryCode: 'MEX' },
  { id: 'mumbai',       name: 'Mumbai',        lat: 19.0760,  lng: 72.8777,   difficulty: 'easy',     countryCode: 'IND' },
  { id: 'berlin',       name: 'Berlin',        lat: 52.5200,  lng: 13.4050,   difficulty: 'easy',     countryCode: 'DEU' },
  { id: 'rome',         name: 'Rome',          lat: 41.9028,  lng: 12.4964,   difficulty: 'easy',     countryCode: 'ITA' },
  { id: 'madrid',       name: 'Madrid',        lat: 40.4168,  lng: -3.7038,   difficulty: 'easy',     countryCode: 'ESP' },
  { id: 'dubai',        name: 'Dubai',         lat: 25.2048,  lng: 55.2708,   difficulty: 'easy',     countryCode: 'ARE' },

  // Moderate — secondary capitals and regional cities
  { id: 'warsaw',       name: 'Warsaw',        lat: 52.2297,  lng: 21.0122,   difficulty: 'moderate', countryCode: 'POL' },
  { id: 'bangkok',      name: 'Bangkok',       lat: 13.7563,  lng: 100.5018,  difficulty: 'moderate', countryCode: 'THA' },
  { id: 'nairobi',      name: 'Nairobi',       lat: -1.2921,  lng: 36.8219,   difficulty: 'moderate', countryCode: 'KEN' },
  { id: 'buenos-aires', name: 'Buenos Aires',  lat: -34.6037, lng: -58.3816,  difficulty: 'moderate', countryCode: 'ARG' },
  { id: 'seoul',        name: 'Seoul',         lat: 37.5665,  lng: 126.9780,  difficulty: 'moderate', countryCode: 'KOR' },
  { id: 'lagos',        name: 'Lagos',         lat: 6.5244,   lng: 3.3792,    difficulty: 'moderate', countryCode: 'NGA' },
  { id: 'istanbul',     name: 'Istanbul',      lat: 41.0082,  lng: 28.9784,   difficulty: 'moderate', countryCode: 'TUR' },
  { id: 'jakarta',      name: 'Jakarta',       lat: -6.2088,  lng: 106.8456,  difficulty: 'moderate', countryCode: 'IDN' },
  { id: 'lima',         name: 'Lima',          lat: -12.0464, lng: -77.0428,  difficulty: 'moderate', countryCode: 'PER' },
  { id: 'casablanca',   name: 'Casablanca',    lat: 33.5731,  lng: -7.5898,   difficulty: 'moderate', countryCode: 'MAR' },
  { id: 'tehran',       name: 'Tehran',        lat: 35.6892,  lng: 51.3890,   difficulty: 'moderate', countryCode: 'IRN' },
  { id: 'bogota',       name: 'Bogotá',        lat: 4.7110,   lng: -74.0721,  difficulty: 'moderate', countryCode: 'COL' },
  { id: 'dhaka',        name: 'Dhaka',         lat: 23.8103,  lng: 90.4125,   difficulty: 'moderate', countryCode: 'BGD' },
  { id: 'kinshasa',     name: 'Kinshasa',      lat: -4.4419,  lng: 15.2663,   difficulty: 'moderate', countryCode: 'COD' },
  { id: 'santiago',     name: 'Santiago',      lat: -33.4489, lng: -70.6693,  difficulty: 'moderate', countryCode: 'CHL' },
  { id: 'stockholm',    name: 'Stockholm',     lat: 59.3293,  lng: 18.0686,   difficulty: 'moderate', countryCode: 'SWE' },

  // Hard — obscure capitals and small-nation cities
  { id: 'ulaanbaatar',  name: 'Ulaanbaatar',   lat: 47.8864,  lng: 106.9057,  difficulty: 'hard',     countryCode: 'MNG' },
  { id: 'reykjavik',    name: 'Reykjavik',     lat: 64.1265,  lng: -21.8174,  difficulty: 'hard',     countryCode: 'ISL' },
  { id: 'ashgabat',     name: 'Ashgabat',      lat: 37.9601,  lng: 58.3261,   difficulty: 'hard',     countryCode: 'TKM' },
  { id: 'bishkek',      name: 'Bishkek',       lat: 42.8746,  lng: 74.5698,   difficulty: 'hard',     countryCode: 'KGZ' },
  { id: 'vientiane',    name: 'Vientiane',     lat: 17.9757,  lng: 102.6331,  difficulty: 'hard',     countryCode: 'LAO' },
  { id: 'paramaribo',   name: 'Paramaribo',    lat: 5.8520,   lng: -55.2038,  difficulty: 'hard',     countryCode: 'SUR' },
  { id: 'nouakchott',   name: 'Nouakchott',    lat: 18.0735,  lng: -15.9582,  difficulty: 'hard',     countryCode: 'MRT' },
  { id: 'dili',         name: 'Dili',          lat: -8.5569,  lng: 125.5789,  difficulty: 'hard',     countryCode: 'TLS' },
  { id: 'niamey',       name: 'Niamey',        lat: 13.5137,  lng: 2.1098,    difficulty: 'hard',     countryCode: 'NER' },
  { id: 'maseru',       name: 'Maseru',        lat: -29.3167, lng: 27.4833,   difficulty: 'hard',     countryCode: 'LSO' },
  { id: 'yamoussoukro', name: 'Yamoussoukro',  lat: 6.8276,   lng: -5.2893,   difficulty: 'hard',     countryCode: 'CIV' },
  { id: 'malabo',       name: 'Malabo',        lat: 3.7500,   lng: 8.7833,    difficulty: 'hard',     countryCode: 'GNQ' },
]

export const usCities: City[] = [
  // Easy — major metros
  { id: 'us-new-york',    name: 'New York',      lat: 40.7128,  lng: -74.006,   difficulty: 'easy',     countryCode: 'USA', stateName: 'New York' },
  { id: 'us-los-angeles', name: 'Los Angeles',   lat: 34.0522,  lng: -118.2437, difficulty: 'easy',     countryCode: 'USA', stateName: 'California' },
  { id: 'us-chicago',     name: 'Chicago',       lat: 41.8781,  lng: -87.6298,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Illinois' },
  { id: 'us-houston',     name: 'Houston',       lat: 29.7604,  lng: -95.3698,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Texas' },
  { id: 'us-miami',       name: 'Miami',         lat: 25.7617,  lng: -80.1918,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Florida' },
  { id: 'us-seattle',     name: 'Seattle',       lat: 47.6062,  lng: -122.3321, difficulty: 'easy',     countryCode: 'USA', stateName: 'Washington' },
  { id: 'us-denver',      name: 'Denver',        lat: 39.7392,  lng: -104.9903, difficulty: 'easy',     countryCode: 'USA', stateName: 'Colorado' },
  { id: 'us-boston',      name: 'Boston',        lat: 42.3601,  lng: -71.0589,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Massachusetts' },
  { id: 'us-atlanta',     name: 'Atlanta',       lat: 33.7490,  lng: -84.3880,  difficulty: 'easy',     countryCode: 'USA', stateName: 'Georgia' },
  { id: 'us-phoenix',     name: 'Phoenix',       lat: 33.4484,  lng: -112.0740, difficulty: 'easy',     countryCode: 'USA', stateName: 'Arizona' },

  // Moderate — state capitals of mid-sized states
  { id: 'us-nashville',   name: 'Nashville',     lat: 36.1627,  lng: -86.7816,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Tennessee' },
  { id: 'us-columbus',    name: 'Columbus',      lat: 39.9612,  lng: -82.9988,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Ohio' },
  { id: 'us-austin',      name: 'Austin',        lat: 30.2672,  lng: -97.7431,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Texas' },
  { id: 'us-sacramento',  name: 'Sacramento',    lat: 38.5816,  lng: -121.4944, difficulty: 'moderate', countryCode: 'USA', stateName: 'California' },
  { id: 'us-raleigh',     name: 'Raleigh',       lat: 35.7796,  lng: -78.6382,  difficulty: 'moderate', countryCode: 'USA', stateName: 'North Carolina' },
  { id: 'us-richmond',    name: 'Richmond',      lat: 37.5407,  lng: -77.4360,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Virginia' },
  { id: 'us-indianapolis',name: 'Indianapolis',  lat: 39.7684,  lng: -86.1581,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Indiana' },
  { id: 'us-portland',    name: 'Portland',      lat: 45.5051,  lng: -122.6750, difficulty: 'moderate', countryCode: 'USA', stateName: 'Oregon' },
  { id: 'us-minneapolis', name: 'Minneapolis',   lat: 44.9778,  lng: -93.2650,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Minnesota' },
  { id: 'us-salt-lake',   name: 'Salt Lake City',lat: 40.7608,  lng: -111.8910, difficulty: 'moderate', countryCode: 'USA', stateName: 'Utah' },
  { id: 'us-little-rock', name: 'Little Rock',   lat: 34.7465,  lng: -92.2896,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Arkansas' },
  { id: 'us-baton-rouge', name: 'Baton Rouge',   lat: 30.4515,  lng: -91.1871,  difficulty: 'moderate', countryCode: 'USA', stateName: 'Louisiana' },

  // Hard — obscure state capitals
  { id: 'us-pierre',      name: 'Pierre',        lat: 44.3683,  lng: -100.3510, difficulty: 'hard',     countryCode: 'USA', stateName: 'South Dakota' },
  { id: 'us-bismarck',    name: 'Bismarck',      lat: 46.8083,  lng: -100.7837, difficulty: 'hard',     countryCode: 'USA', stateName: 'North Dakota' },
  { id: 'us-cheyenne',    name: 'Cheyenne',      lat: 41.1400,  lng: -104.8202, difficulty: 'hard',     countryCode: 'USA', stateName: 'Wyoming' },
  { id: 'us-helena',      name: 'Helena',        lat: 46.5958,  lng: -112.0270, difficulty: 'hard',     countryCode: 'USA', stateName: 'Montana' },
  { id: 'us-juneau',      name: 'Juneau',        lat: 58.3005,  lng: -134.4197, difficulty: 'hard',     countryCode: 'USA', stateName: 'Alaska' },
  { id: 'us-dover',       name: 'Dover',         lat: 39.1582,  lng: -75.5244,  difficulty: 'hard',     countryCode: 'USA', stateName: 'Delaware' },
  { id: 'us-montpelier',  name: 'Montpelier',    lat: 44.2601,  lng: -72.5754,  difficulty: 'hard',     countryCode: 'USA', stateName: 'Vermont' },
  { id: 'us-augusta',     name: 'Augusta',       lat: 44.3107,  lng: -69.7795,  difficulty: 'hard',     countryCode: 'USA', stateName: 'Maine' },
  { id: 'us-concord',     name: 'Concord',       lat: 43.2081,  lng: -71.5376,  difficulty: 'hard',     countryCode: 'USA', stateName: 'New Hampshire' },
  { id: 'us-annapolis',   name: 'Annapolis',     lat: 38.9784,  lng: -76.4922,  difficulty: 'hard',     countryCode: 'USA', stateName: 'Maryland' },
]
