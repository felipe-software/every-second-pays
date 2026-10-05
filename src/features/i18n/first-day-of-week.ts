import type { Language } from "./translations";

// Regions whose weeks start on Sunday or Saturday (CLDR); everywhere else starts on Monday.
const SUNDAY_FIRST = new Set([
    "AG", "AS", "BD", "BR", "BS", "BT", "BW", "BZ", "CA", "CN", "CO", "DM", "DO", "ET", "GT",
    "GU", "HK", "HN", "ID", "IL", "IN", "JM", "JP", "KE", "KH", "KR", "LA", "MH", "MM", "MO",
    "MT", "MX", "MZ", "NI", "NP", "PA", "PE", "PH", "PK", "PR", "PT", "PY", "SA", "SG", "SV",
    "TH", "TT", "TW", "UM", "US", "VE", "VI", "WS", "YE", "ZA", "ZW",
]);
const SATURDAY_FIRST = new Set(["AE", "AF", "BH", "DJ", "DZ", "EG", "IQ", "IR", "JO", "KW", "LY", "OM", "QA", "SD", "SY"]);

/**
 * The weekday a week starts on (0 = Sunday … 6 = Saturday). Portuguese always starts on
 * Monday; otherwise it follows the device calendar (`firstWeekday`, 1 = Sunday), falling
 * back to the region's convention when the platform doesn't report one.
 */
export function firstDayOfWeek(language: Language, calendarFirstWeekday: number | null | undefined, region: string | null | undefined) {
    if (language === "pt") return 1;
    if (calendarFirstWeekday != null && calendarFirstWeekday >= 1 && calendarFirstWeekday <= 7) return calendarFirstWeekday - 1;
    const code = region?.toUpperCase();
    if (code && SUNDAY_FIRST.has(code)) return 0;
    if (code && SATURDAY_FIRST.has(code)) return 6;
    return 1;
}
