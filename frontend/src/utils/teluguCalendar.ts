export interface TeluguDateInfo {
  month: string;
  tithi: string;
  isAmavasya: boolean;
  isPournami: boolean;
  paksha: 'Shukla' | 'Krishna';
}

const TELUGU_MONTHS = [
  "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
  "Ashvina", "Kartika", "Margashira", "Pausha", "Magha", "Phalguna"
];

const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashti", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Pournami",
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashti", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya"
];

// Reference New Moon: December 30, 2024 at 22:27:00 UTC
const REFERENCE_NEW_MOON = new Date(Date.UTC(2024, 11, 30, 22, 27, 0));
const SYNODIC_MONTH = 29.530588853;

// Map of New Moon starts for Chaitra (Ugadi starts the next day on Shukla Pratipada)
const CHAITRA_NEW_MOONS: { [year: number]: Date } = {
  2023: new Date(Date.UTC(2023, 2, 21, 17, 23, 0)),
  2024: new Date(Date.UTC(2024, 3, 8, 18, 21, 0)),
  2025: new Date(Date.UTC(2025, 2, 29, 9, 0, 0)),
  2026: new Date(Date.UTC(2026, 2, 18, 17, 0, 0)),
  2027: new Date(Date.UTC(2027, 2, 8, 0, 0, 0)),
  2028: new Date(Date.UTC(2028, 2, 26, 0, 0, 0)),
  2029: new Date(Date.UTC(2029, 2, 15, 0, 0, 0)),
  2030: new Date(Date.UTC(2030, 3, 3, 0, 0, 0))
};

export function getTeluguDateInfo(date: Date): TeluguDateInfo {
  // Use UTC midnight of the target date to avoid local client timezone shift bugs
  const targetDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
  
  const diffMs = targetDate.getTime() - REFERENCE_NEW_MOON.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  // Calculate lunar age (0 to 29.53)
  const lunarAge = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  
  // Tithi calculation (0 to 29)
  const partSize = SYNODIC_MONTH / 30;
  const tithiIndex = Math.floor(lunarAge / partSize);
  
  const isPournami = tithiIndex === 14;
  const isAmavasya = tithiIndex === 29;
  const paksha = tithiIndex < 15 ? 'Shukla' : 'Krishna';
  const tithiName = TITHI_NAMES[tithiIndex];
  
  // Determine preceding new moon date for month calculation
  const precedingNewMoonMs = targetDate.getTime() - (lunarAge * 24 * 60 * 60 * 1000);
  const precedingNewMoonDate = new Date(precedingNewMoonMs);
  
  let targetYear = precedingNewMoonDate.getUTCFullYear();
  let chaitraNewMoon = CHAITRA_NEW_MOONS[targetYear];
  
  // Fallback to average Chaitra start if year is not in map
  if (!chaitraNewMoon) {
    chaitraNewMoon = new Date(Date.UTC(targetYear, 2, 20, 0, 0, 0));
  }
  
  // If the preceding New Moon is before this year's Chaitra start, it belongs to the previous year's Chaitra cycle
  if (precedingNewMoonDate < chaitraNewMoon) {
    targetYear -= 1;
    chaitraNewMoon = CHAITRA_NEW_MOONS[targetYear] || new Date(Date.UTC(targetYear, 2, 20, 0, 0, 0));
  }
  
  const timeSinceChaitraMs = precedingNewMoonDate.getTime() - chaitraNewMoon.getTime();
  const daysSinceChaitra = timeSinceChaitraMs / (1000 * 60 * 60 * 24);
  
  // Months elapsed since Chaitra
  let monthsElapsed = Math.round(daysSinceChaitra / SYNODIC_MONTH);
  monthsElapsed = ((monthsElapsed % 12) + 12) % 12;
  
  const monthName = TELUGU_MONTHS[monthsElapsed];
  
  return {
    month: monthName,
    tithi: tithiName,
    isAmavasya,
    isPournami,
    paksha
  };
}
