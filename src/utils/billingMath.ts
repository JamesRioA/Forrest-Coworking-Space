// Strict math utility for calculating final session cost

export type ZoneType = 'standard' | 'conference';
export type TimeModelType = 'open' | 'fixed';

export interface BillingInput {
  zone: ZoneType;
  timeModel: TimeModelType;
  isMember: boolean;
  hoursStayed: number; // Decimal hours e.g. 2.5
  fixedBlockHours?: number; 
  fixedBlockPrice?: number;
  brownoutApplied: boolean;
}

export function calculateTotalBilled(input: BillingInput): number {
  let { zone, timeModel, isMember, hoursStayed, fixedBlockHours = 0, fixedBlockPrice = 0, brownoutApplied } = input;
  
  let baseCharge = 0;
  let overtimePenalty = 0;

  // Base Hourly Rates 
  const standardHourlyRate = isMember ? 30.00 : 35.00;
  const conferenceHourlyRate = isMember ? 50.00 : 60.00;
  
  const hourlyRate = zone === 'standard' ? standardHourlyRate : conferenceHourlyRate;

  if (timeModel === 'open') {
    // PROMO EXCEPTION: zone = standard AND time_model = open AND hours_stayed = EXACTLY 3.00 -> ₱100.00 flat
    // NOTE: Float math precision issues circumvented contextually, ideally checking within a small epsilon if deriving from timestamps.
    const isPromo = zone === 'standard' && Math.abs(hoursStayed - 3.00) < 0.01;
    
    if (isPromo) {
      baseCharge = 100.00;
    } else {
      // Regular open ended multiplier
      baseCharge = hoursStayed * hourlyRate;
    }
  } 
  else if (timeModel === 'fixed') {
    baseCharge = fixedBlockPrice;

    if (hoursStayed > fixedBlockHours) {
      const overtimeHours = hoursStayed - fixedBlockHours;
      overtimePenalty = overtimeHours * hourlyRate;
    }
  }

  let finalTotal = baseCharge + overtimePenalty;

  if (brownoutApplied) {
    finalTotal += (10.00 * hoursStayed);
  }

  // Ensure returning 2 decimal precise standard monetary value if needed, or raw number
  return Number(finalTotal.toFixed(2));
}

// UNIT TEST ASSERTIONS (commented at bottom of billingMath.ts):
// 2hr standard open regular        → ₱70.00
// 3hr standard open regular        → ₱100.00 (promo)
// 4hr standard open regular        → ₱140.00 (promo does not apply)
// 3hr standard open + brownout     → ₱100.00 + ₱30.00 = ₱130.00
// 3hr standard fixed               → ₱100.00
// 3hr standard fixed + 1hr OT      → ₱100.00 + ₱35.00 = ₱135.00
// 3hr standard fixed + 1hr OT + brownout → ₱135.00 + ₱40.00 = ₱175.00
// 2hr conference open regular      → ₱120.00
// 3hr conference fixed             → ₱180.00
// 3hr conference fixed + 0.5hr OT  → ₱180.00 + ₱30.00 = ₱210.00
