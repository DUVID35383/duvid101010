export const DEFAULT_TERMS_TEXT = `• המחיר כולל ייצור והרכבה מלאה במפעל. הובלה והנפה יתומחרו בנפרד לפי מיקום ההצבה.
• תנאי תשלום: 40% במעמד הזמנה, 40% עם סיום שלדת הברזל והמעטפת, 20% לפני מסירה.
• זמן אספקה משוער: כ-14 ימי עבודה ממועד אישור התוכניות.
• אחריות: 24 חודשים על הקונסטרוקציה והאיטום, אחריות יצרן על מוצרי החשמל והמזגן.`;

export function getDefaultTerms(): string {
  try {
    const saved = localStorage.getItem('mobile_room_calc_default_terms_v1');
    if (saved && saved.trim().length > 0) {
      return saved;
    }
  } catch (e) {
    console.error('Failed to read default terms from localStorage', e);
  }
  return DEFAULT_TERMS_TEXT;
}

export function saveDefaultTerms(terms: string): void {
  try {
    localStorage.setItem('mobile_room_calc_default_terms_v1', terms);
  } catch (e) {
    console.error('Failed to save default terms to localStorage', e);
  }
}
