export interface CountryData {
  code: string;
  name: string;
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  center: [number, number];
  zoom: number;
}

export const COUNTRIES: CountryData[] = [
  // ── A ──
  { code: 'AF', name: 'Afghanistan', bounds: [[29.4, 60.5], [38.5, 74.9]], center: [33.9, 67.7], zoom: 6 },
  { code: 'AL', name: 'Albania', bounds: [[39.6, 19.3], [42.7, 21.1]], center: [41.2, 20.2], zoom: 7 },
  { code: 'DZ', name: 'Algeria', bounds: [[19.0, -8.7], [37.1, 12.0]], center: [28.0, 1.7], zoom: 5 },
  { code: 'AR', name: 'Argentina', bounds: [[-55.1, -73.6], [-21.8, -53.6]], center: [-38.4, -63.6], zoom: 4 },
  { code: 'AT', name: 'Austria', bounds: [[46.4, 9.5], [49.0, 17.2]], center: [47.5, 14.6], zoom: 7 },
  { code: 'AU', name: 'Australia', bounds: [[-44, 112], [-10, 154]], center: [-25, 134], zoom: 4 },
  // ── B ──
  { code: 'BS', name: 'Bahamas', bounds: [[20.9, -80.5], [27.3, -72.7]], center: [24.3, -76.0], zoom: 7 },
  { code: 'BH', name: 'Bahrain', bounds: [[25.8, 50.4], [26.3, 50.7]], center: [26.0, 50.6], zoom: 10 },
  { code: 'BD', name: 'Bangladesh', bounds: [[20.7, 88.0], [26.6, 92.7]], center: [23.7, 90.4], zoom: 7 },
  { code: 'BE', name: 'Belgium', bounds: [[49.5, 2.5], [51.5, 6.4]], center: [50.5, 4.5], zoom: 8 },
  { code: 'BO', name: 'Bolivia', bounds: [[-22.9, -69.6], [-9.7, -57.5]], center: [-16.3, -63.6], zoom: 6 },
  { code: 'BA', name: 'Bosnia and Herzegovina', bounds: [[42.6, 15.7], [45.3, 19.6]], center: [43.9, 17.7], zoom: 7 },
  { code: 'BR', name: 'Brazil', bounds: [[-33.7, -73.9], [5.3, -34.8]], center: [-14.2, -51.9], zoom: 4 },
  { code: 'BG', name: 'Bulgaria', bounds: [[41.2, 22.4], [44.2, 28.6]], center: [42.7, 25.5], zoom: 7 },
  { code: 'BF', name: 'Burkina Faso', bounds: [[9.4, -5.5], [15.1, 2.4]], center: [12.3, -1.6], zoom: 6 },
  { code: 'BI', name: 'Burundi', bounds: [[-4.5, 29.0], [-2.3, 30.8]], center: [-3.4, 29.9], zoom: 9 },
  // ── C ──
  { code: 'KH', name: 'Cambodia', bounds: [[10.4, 102.3], [14.7, 107.6]], center: [12.6, 105.0], zoom: 7 },
  { code: 'CM', name: 'Cameroon', bounds: [[1.7, 8.5], [13.1, 16.2]], center: [7.4, 12.4], zoom: 6 },
  { code: 'CA', name: 'Canada', bounds: [[41.7, -141], [83.1, -52.6]], center: [56, -96], zoom: 4 },
  { code: 'CF', name: 'Central African Republic', bounds: [[2.2, 14.4], [11.0, 27.5]], center: [6.6, 21.0], zoom: 6 },
  { code: 'TD', name: 'Chad', bounds: [[7.4, 13.5], [23.4, 24.0]], center: [15.4, 18.7], zoom: 5 },
  { code: 'CL', name: 'Chile', bounds: [[-55.9, -75.6], [-17.5, -66.9]], center: [-35.7, -71.5], zoom: 4 },
  { code: 'CN', name: 'China', bounds: [[18.2, 73.5], [53.6, 134.8]], center: [35.9, 104.2], zoom: 4 },
  { code: 'CO', name: 'Colombia', bounds: [[-4.2, -81.7], [12.5, -66.9]], center: [4.6, -74.3], zoom: 6 },
  { code: 'CD', name: 'Dem. Rep. Congo', bounds: [[-13.5, 12.2], [5.4, 31.3]], center: [-4.0, 21.8], zoom: 5 },
  { code: 'CG', name: 'Congo', bounds: [[-5.0, 11.2], [3.7, 18.6]], center: [-0.7, 14.9], zoom: 6 },
  { code: 'CR', name: 'Costa Rica', bounds: [[8.0, -86.0], [11.2, -82.6]], center: [9.7, -83.8], zoom: 8 },
  { code: 'HR', name: 'Croatia', bounds: [[42.4, 13.5], [46.6, 19.4]], center: [44.5, 16.5], zoom: 7 },
  { code: 'CU', name: 'Cuba', bounds: [[19.8, -85.0], [23.3, -74.1]], center: [21.5, -79.0], zoom: 7 },
  { code: 'CY', name: 'Cyprus', bounds: [[34.6, 32.3], [35.7, 34.6]], center: [35.1, 33.4], zoom: 9 },
  { code: 'CZ', name: 'Czech Republic', bounds: [[48.6, 12.1], [51.1, 18.9]], center: [49.8, 15.5], zoom: 7 },
  // ── D ──
  { code: 'DK', name: 'Denmark', bounds: [[54.6, 8.1], [57.8, 15.2]], center: [56.3, 9.5], zoom: 7 },
  { code: 'DO', name: 'Dominican Republic', bounds: [[17.5, -72.0], [19.9, -68.3]], center: [18.7, -70.2], zoom: 8 },
  // ── E ──
  { code: 'EC', name: 'Ecuador', bounds: [[-5.0, -81.1], [1.5, -75.2]], center: [-1.8, -78.2], zoom: 7 },
  { code: 'EG', name: 'Egypt', bounds: [[22.0, 24.7], [31.7, 36.9]], center: [26.8, 30.8], zoom: 6 },
  { code: 'SV', name: 'El Salvador', bounds: [[13.2, -90.1], [14.4, -87.7]], center: [13.8, -88.9], zoom: 9 },
  { code: 'EE', name: 'Estonia', bounds: [[57.5, 21.8], [59.7, 28.2]], center: [58.6, 25.0], zoom: 7 },
  { code: 'ER', name: 'Eritrea', bounds: [[12.4, 36.4], [18.0, 43.1]], center: [15.2, 39.8], zoom: 7 },
  { code: 'ET', name: 'Ethiopia', bounds: [[3.4, 33.0], [14.9, 48.0]], center: [9.1, 40.5], zoom: 6 },
  // ── F ──
  { code: 'FI', name: 'Finland', bounds: [[59.8, 20.6], [70.1, 31.6]], center: [64.0, 26.0], zoom: 5 },
  { code: 'FR', name: 'France', bounds: [[41.4, -5.1], [51.1, 9.6]], center: [46.2, 2.2], zoom: 6 },
  // ── G ──
  { code: 'GA', name: 'Gabon', bounds: [[-3.9, 8.7], [2.3, 14.5]], center: [-0.8, 11.6], zoom: 7 },
  { code: 'GE', name: 'Georgia', bounds: [[41.1, 40.0], [43.6, 46.7]], center: [42.3, 43.4], zoom: 7 },
  { code: 'DE', name: 'Germany', bounds: [[47.3, 5.9], [55.1, 15.1]], center: [51.2, 10.5], zoom: 6 },
  { code: 'GH', name: 'Ghana', bounds: [[4.7, -3.3], [11.2, 1.2]], center: [7.9, -1.0], zoom: 7 },
  { code: 'GR', name: 'Greece', bounds: [[34.8, 19.4], [41.7, 29.6]], center: [39.1, 21.8], zoom: 6 },
  { code: 'GN', name: 'Guinea', bounds: [[7.2, -15.1], [12.7, -7.6]], center: [9.9, -11.4], zoom: 7 },
  { code: 'GT', name: 'Guatemala', bounds: [[13.7, -92.2], [17.8, -88.2]], center: [15.8, -90.2], zoom: 7 },
  // ── H ──
  { code: 'HT', name: 'Haiti', bounds: [[18.0, -74.5], [20.1, -71.6]], center: [19.1, -72.7], zoom: 8 },
  { code: 'HN', name: 'Honduras', bounds: [[12.9, -89.4], [16.5, -83.1]], center: [15.2, -86.2], zoom: 7 },
  { code: 'HU', name: 'Hungary', bounds: [[45.7, 16.1], [48.6, 22.9]], center: [47.2, 19.5], zoom: 7 },
  // ── I ──
  { code: 'IS', name: 'Iceland', bounds: [[63.4, -24.5], [66.5, -13.5]], center: [65.0, -19.0], zoom: 6 },
  { code: 'IN', name: 'India', bounds: [[6.7, 68.2], [37.1, 97.4]], center: [22.0, 78.9], zoom: 5 },
  { code: 'ID', name: 'Indonesia', bounds: [[-11.0, 95.0], [6.1, 141.0]], center: [-2.5, 118.0], zoom: 4 },
  { code: 'IR', name: 'Iran', bounds: [[25.1, 44.0], [39.8, 63.3]], center: [32.4, 53.7], zoom: 5 },
  { code: 'IQ', name: 'Iraq', bounds: [[29.1, 38.8], [37.4, 48.6]], center: [33.2, 43.7], zoom: 6 },
  { code: 'IE', name: 'Ireland', bounds: [[51.4, -10.5], [55.4, -6.0]], center: [53.4, -8.2], zoom: 7 },
  { code: 'IL', name: 'Israel', bounds: [[29.5, 34.3], [33.3, 35.9]], center: [31.5, 34.8], zoom: 8 },
  { code: 'IT', name: 'Italy', bounds: [[36.6, 6.6], [47.1, 18.5]], center: [41.9, 12.5], zoom: 6 },
  // ── J ──
  { code: 'JM', name: 'Jamaica', bounds: [[17.7, -78.4], [18.5, -76.2]], center: [18.1, -77.3], zoom: 9 },
  { code: 'JP', name: 'Japan', bounds: [[24.4, 122.9], [45.6, 153.9]], center: [36.2, 138.3], zoom: 5 },
  { code: 'JO', name: 'Jordan', bounds: [[29.2, 34.9], [33.4, 39.3]], center: [31.3, 37.1], zoom: 7 },
  // ── K ──
  { code: 'KZ', name: 'Kazakhstan', bounds: [[40.6, 46.5], [55.4, 87.3]], center: [48.0, 67.0], zoom: 5 },
  { code: 'KE', name: 'Kenya', bounds: [[-4.7, 33.9], [5.0, 41.9]], center: [-0.0, 37.9], zoom: 6 },
  { code: 'KP', name: 'North Korea', bounds: [[37.7, 124.3], [43.0, 130.7]], center: [40.3, 127.5], zoom: 7 },
  { code: 'KW', name: 'Kuwait', bounds: [[28.5, 46.6], [30.1, 48.4]], center: [29.3, 47.5], zoom: 9 },
  { code: 'KR', name: 'South Korea', bounds: [[33.1, 124.6], [38.6, 131.9]], center: [35.9, 127.8], zoom: 7 },
  // ── L ──
  { code: 'LV', name: 'Latvia', bounds: [[55.7, 21.0], [58.1, 28.2]], center: [56.9, 24.1], zoom: 7 },
  { code: 'LB', name: 'Lebanon', bounds: [[33.1, 35.1], [34.7, 36.6]], center: [33.9, 35.9], zoom: 9 },
  { code: 'LY', name: 'Libya', bounds: [[19.5, 9.3], [33.2, 25.2]], center: [26.3, 17.2], zoom: 5 },
  { code: 'LT', name: 'Lithuania', bounds: [[53.9, 21.0], [56.4, 26.8]], center: [55.2, 23.9], zoom: 7 },
  { code: 'LU', name: 'Luxembourg', bounds: [[49.4, 5.7], [50.2, 6.5]], center: [49.8, 6.1], zoom: 10 },
  // ── M ──
  { code: 'MY', name: 'Malaysia', bounds: [[0.9, 99.6], [7.4, 119.3]], center: [4.2, 109.5], zoom: 6 },
  { code: 'MT', name: 'Malta', bounds: [[35.8, 14.2], [36.1, 14.6]], center: [35.9, 14.4], zoom: 11 },
  { code: 'MX', name: 'Mexico', bounds: [[14.5, -118.4], [32.7, -86.7]], center: [23.6, -102.5], zoom: 5 },
  { code: 'MG', name: 'Madagascar', bounds: [[-25.6, 43.2], [-11.9, 50.5]], center: [-18.8, 46.9], zoom: 6 },
  { code: 'MW', name: 'Malawi', bounds: [[-17.1, 32.7], [-9.4, 35.9]], center: [-13.3, 34.3], zoom: 7 },
  { code: 'ML', name: 'Mali', bounds: [[10.1, -12.2], [25.0, 4.3]], center: [17.6, -4.0], zoom: 5 },
  { code: 'MA', name: 'Morocco', bounds: [[27.7, -13.2], [35.9, -1.0]], center: [31.8, -7.1], zoom: 6 },
  { code: 'MZ', name: 'Mozambique', bounds: [[-26.9, 30.2], [-10.5, 40.8]], center: [-18.7, 35.5], zoom: 5 },
  { code: 'MR', name: 'Mauritania', bounds: [[14.7, -17.1], [27.3, -4.8]], center: [21.0, -10.9], zoom: 5 },
  { code: 'MM', name: 'Myanmar', bounds: [[9.8, 92.2], [28.5, 101.2]], center: [19.2, 96.7], zoom: 6 },
  // ── N ──
  { code: 'NA', name: 'Namibia', bounds: [[-28.9, 11.7], [-16.9, 25.3]], center: [-22.9, 18.5], zoom: 6 },
  { code: 'NE', name: 'Niger', bounds: [[11.7, 0.2], [23.5, 16.0]], center: [17.6, 8.1], zoom: 5 },
  { code: 'NP', name: 'Nepal', bounds: [[26.4, 80.1], [30.4, 88.2]], center: [28.4, 84.1], zoom: 7 },
  { code: 'NL', name: 'Netherlands', bounds: [[50.8, 3.4], [53.5, 7.2]], center: [52.1, 5.3], zoom: 8 },
  { code: 'NZ', name: 'New Zealand', bounds: [[-47.3, 166.4], [-34.4, 178.6]], center: [-40.9, 174.9], zoom: 5 },
  { code: 'NI', name: 'Nicaragua', bounds: [[10.7, -87.7], [15.0, -83.1]], center: [12.9, -85.2], zoom: 7 },
  { code: 'NG', name: 'Nigeria', bounds: [[4.3, 2.7], [13.9, 14.7]], center: [9.1, 8.7], zoom: 6 },
  { code: 'NO', name: 'Norway', bounds: [[58.0, 4.5], [71.2, 31.1]], center: [64.5, 17.1], zoom: 5 },
  // ── O ──
  { code: 'OM', name: 'Oman', bounds: [[16.7, 52.0], [26.4, 59.8]], center: [21.5, 56.0], zoom: 6 },
  // ── P ──
  { code: 'PK', name: 'Pakistan', bounds: [[23.7, 60.9], [37.1, 77.8]], center: [30.4, 69.3], zoom: 5 },
  { code: 'PA', name: 'Panama', bounds: [[7.2, -83.1], [9.6, -77.2]], center: [8.5, -80.8], zoom: 8 },
  { code: 'PY', name: 'Paraguay', bounds: [[-27.6, -62.6], [-19.3, -54.3]], center: [-23.4, -58.4], zoom: 6 },
  { code: 'PE', name: 'Peru', bounds: [[-18.4, -81.3], [-0.0, -68.7]], center: [-9.2, -75.0], zoom: 5 },
  { code: 'PH', name: 'Philippines', bounds: [[4.6, 116.9], [21.1, 126.6]], center: [12.9, 121.8], zoom: 6 },
  { code: 'PL', name: 'Poland', bounds: [[49.0, 14.1], [54.8, 24.1]], center: [51.9, 19.1], zoom: 6 },
  { code: 'PT', name: 'Portugal', bounds: [[36.9, -9.5], [42.2, -6.2]], center: [39.4, -8.2], zoom: 7 },
  { code: 'PR', name: 'Puerto Rico', bounds: [[17.9, -67.3], [18.5, -65.6]], center: [18.2, -66.5], zoom: 9 },
  // ── Q ──
  { code: 'QA', name: 'Qatar', bounds: [[24.5, 50.8], [26.2, 51.7]], center: [25.3, 51.2], zoom: 9 },
  // ── R ──
  { code: 'RO', name: 'Romania', bounds: [[43.6, 20.3], [48.3, 29.7]], center: [45.9, 25.0], zoom: 7 },
  { code: 'RU', name: 'Russia', bounds: [[41.2, 19.6], [81.9, 180]], center: [61.5, 105.3], zoom: 3 },
  { code: 'RW', name: 'Rwanda', bounds: [[-2.8, 28.9], [-1.1, 30.9]], center: [-2.0, 29.9], zoom: 9 },
  // ── S ──
  { code: 'SN', name: 'Senegal', bounds: [[12.3, -17.5], [16.7, -11.4]], center: [14.5, -14.5], zoom: 7 },
  { code: 'SA', name: 'Saudi Arabia', bounds: [[16.4, 34.6], [32.2, 55.7]], center: [24.3, 45.1], zoom: 5 },
  { code: 'RS', name: 'Serbia', bounds: [[42.2, 18.8], [46.2, 23.0]], center: [44.0, 21.0], zoom: 7 },
  { code: 'SG', name: 'Singapore', bounds: [[1.2, 103.6], [1.5, 104.0]], center: [1.4, 103.8], zoom: 11 },
  { code: 'SK', name: 'Slovakia', bounds: [[47.7, 16.8], [49.6, 22.6]], center: [48.7, 19.7], zoom: 7 },
  { code: 'SI', name: 'Slovenia', bounds: [[45.4, 13.4], [46.9, 16.6]], center: [46.2, 15.0], zoom: 8 },
  { code: 'SL', name: 'Sierra Leone', bounds: [[6.9, -13.3], [10.0, -10.3]], center: [8.5, -11.8], zoom: 8 },
  { code: 'SO', name: 'Somalia', bounds: [[-1.7, 40.9], [12.0, 51.4]], center: [5.2, 46.2], zoom: 6 },
  { code: 'ZA', name: 'South Africa', bounds: [[-34.8, 16.3], [-22.1, 32.9]], center: [-28.5, 24.6], zoom: 5 },
  { code: 'SS', name: 'South Sudan', bounds: [[3.5, 23.5], [12.2, 35.9]], center: [7.9, 29.7], zoom: 6 },
  { code: 'ES', name: 'Spain', bounds: [[36.0, -9.3], [43.8, 3.3]], center: [40.5, -3.7], zoom: 6 },
  { code: 'LK', name: 'Sri Lanka', bounds: [[5.9, 79.7], [9.8, 81.9]], center: [7.9, 80.8], zoom: 8 },
  { code: 'SE', name: 'Sweden', bounds: [[55.3, 11.1], [69.1, 24.2]], center: [62.2, 17.6], zoom: 5 },
  { code: 'SD', name: 'Sudan', bounds: [[8.7, 21.8], [22.2, 38.6]], center: [15.5, 30.2], zoom: 5 },
  { code: 'CH', name: 'Switzerland', bounds: [[45.8, 5.9], [47.8, 10.5]], center: [46.8, 8.2], zoom: 8 },
  { code: 'SY', name: 'Syria', bounds: [[32.3, 35.7], [37.3, 42.4]], center: [34.8, 39.1], zoom: 7 },
  // ── T ──
  { code: 'TZ', name: 'Tanzania', bounds: [[-11.7, 29.3], [-1.0, 40.4]], center: [-6.4, 34.9], zoom: 6 },
  { code: 'TG', name: 'Togo', bounds: [[6.1, -0.1], [11.1, 1.8]], center: [8.6, 0.8], zoom: 7 },
  { code: 'TW', name: 'Taiwan', bounds: [[21.9, 120.0], [25.3, 122.0]], center: [23.7, 121.0], zoom: 8 },
  { code: 'TH', name: 'Thailand', bounds: [[5.6, 97.3], [20.5, 105.6]], center: [13.0, 101.5], zoom: 6 },
  { code: 'TT', name: 'Trinidad and Tobago', bounds: [[10.0, -62.0], [11.4, -60.5]], center: [10.5, -61.3], zoom: 9 },
  { code: 'TN', name: 'Tunisia', bounds: [[30.2, 7.5], [37.3, 11.6]], center: [33.9, 9.5], zoom: 7 },
  { code: 'TR', name: 'Turkey', bounds: [[36.0, 26.0], [42.1, 44.8]], center: [39.0, 35.2], zoom: 6 },
  // ── U ──
  { code: 'UG', name: 'Uganda', bounds: [[-1.5, 29.6], [4.2, 35.0]], center: [1.4, 32.3], zoom: 7 },
  { code: 'UA', name: 'Ukraine', bounds: [[44.4, 22.1], [52.4, 40.2]], center: [48.4, 31.2], zoom: 6 },
  { code: 'AE', name: 'United Arab Emirates', bounds: [[22.6, 51.6], [26.1, 56.4]], center: [23.4, 53.8], zoom: 7 },
  { code: 'GB', name: 'United Kingdom', bounds: [[49.9, -8.6], [60.9, 1.8]], center: [54, -2], zoom: 6 },
  { code: 'US', name: 'United States', bounds: [[24.5, -125], [49.5, -66.5]], center: [39, -98], zoom: 4 },
  { code: 'UY', name: 'Uruguay', bounds: [[-35.0, -58.4], [-30.1, -53.1]], center: [-32.5, -55.8], zoom: 7 },
  // ── V ──
  { code: 'UZ', name: 'Uzbekistan', bounds: [[37.2, 56.0], [45.6, 73.1]], center: [41.4, 64.6], zoom: 6 },
  { code: 'VE', name: 'Venezuela', bounds: [[0.6, -73.4], [12.2, -59.8]], center: [6.4, -66.6], zoom: 6 },
  { code: 'VN', name: 'Vietnam', bounds: [[8.4, 102.1], [23.4, 109.5]], center: [16.0, 108.0], zoom: 6 },
  // ── Y ──
  { code: 'YE', name: 'Yemen', bounds: [[12.1, 42.6], [19.0, 54.5]], center: [15.6, 48.5], zoom: 6 },
  // ── Z ──
  { code: 'ZM', name: 'Zambia', bounds: [[-18.1, 21.9], [-8.2, 33.7]], center: [-13.1, 27.8], zoom: 6 },
  { code: 'ZW', name: 'Zimbabwe', bounds: [[-22.4, 25.2], [-15.6, 33.1]], center: [-19.0, 29.2], zoom: 7 },
  // ── Additional ──
  { code: 'AO', name: 'Angola', bounds: [[-18.0, 11.7], [-4.4, 24.1]], center: [-11.2, 17.9], zoom: 5 },
  { code: 'BJ', name: 'Benin', bounds: [[6.2, 0.8], [12.4, 3.9]], center: [9.3, 2.3], zoom: 7 },
  { code: 'BW', name: 'Botswana', bounds: [[-26.9, 19.9], [-17.8, 29.4]], center: [-22.3, 24.7], zoom: 6 },
  { code: 'CI', name: 'Ivory Coast', bounds: [[4.4, -8.6], [10.7, -2.5]], center: [7.5, -5.5], zoom: 7 },
  { code: 'DJ', name: 'Djibouti', bounds: [[10.9, 41.8], [12.7, 43.4]], center: [11.8, 42.6], zoom: 9 },
  { code: 'GQ', name: 'Equatorial Guinea', bounds: [[1.0, 9.3], [2.3, 11.3]], center: [1.7, 10.3], zoom: 9 },
  { code: 'GM', name: 'Gambia', bounds: [[13.1, -16.8], [13.8, -13.8]], center: [13.4, -15.3], zoom: 9 },
  { code: 'GW', name: 'Guinea-Bissau', bounds: [[10.9, -16.7], [12.7, -13.6]], center: [11.8, -15.2], zoom: 8 },
  { code: 'LR', name: 'Liberia', bounds: [[4.4, -11.5], [8.6, -7.4]], center: [6.4, -9.4], zoom: 7 },
  { code: 'LS', name: 'Lesotho', bounds: [[-30.7, 27.0], [-28.6, 29.5]], center: [-29.6, 28.2], zoom: 8 },
  { code: 'SZ', name: 'Eswatini', bounds: [[-27.3, 30.8], [-25.7, 32.1]], center: [-26.5, 31.5], zoom: 9 },
  { code: 'MN', name: 'Mongolia', bounds: [[41.6, 87.8], [52.1, 119.9]], center: [46.9, 103.8], zoom: 5 },
  { code: 'LA', name: 'Laos', bounds: [[13.9, 100.1], [22.5, 107.7]], center: [18.2, 103.9], zoom: 6 },
  { code: 'TM', name: 'Turkmenistan', bounds: [[35.1, 52.5], [42.8, 66.7]], center: [39.0, 59.6], zoom: 6 },
  { code: 'TJ', name: 'Tajikistan', bounds: [[36.7, 67.4], [41.0, 75.1]], center: [38.9, 71.3], zoom: 7 },
  { code: 'KG', name: 'Kyrgyzstan', bounds: [[39.2, 69.3], [43.3, 80.2]], center: [41.2, 74.8], zoom: 7 },
  { code: 'AZ', name: 'Azerbaijan', bounds: [[38.4, 44.8], [41.9, 50.6]], center: [40.1, 47.6], zoom: 7 },
  { code: 'AM', name: 'Armenia', bounds: [[38.8, 43.4], [41.3, 46.6]], center: [40.1, 45.0], zoom: 8 },
];

export function getCountryByCode(code: string): CountryData | undefined {
  return COUNTRIES.find(c => c.code === code);
}
