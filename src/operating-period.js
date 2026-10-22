export const START_DATE='2026-10-20';
export const inOperatingPeriod=date=>date>=START_DATE;
export const clampStart=date=>date<START_DATE?START_DATE:date;
