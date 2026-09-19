/**
 * Keeps every assessor utterance in situational-judgment form.
 * CRITICAL: employee is always the assessed role (e.g. Sales Associate) — never the shopper/customer.
 */

const IMMERSION_AS_CUSTOMER =
  /\b(what brings you|your day at the mall|beauty aisle today|how(?:'s| is) your (?:day|shopping)|looking for today|can I help you find)\b/i;

const SOUNDS_LIKE_CUSTOMER_CHAT =
  /\b(tell me (a bit )?about your day|weekend (at|in) the mall|browsing (the )?(aisle|shelf))\b/i;

/** Treats the employee as the buyer / shopper — off-path for assessment. */
const BUYER_PERSPECTIVE =
  /\b(choosing .{0,60}(while )?shopp|while shopping|most important to you|important to you and why|your decision on|influence your decision|factors .{0,40}important to you|what do you look for (in|when)|when you (buy|shop|purchase|choose)|as a (shopper|customer|buyer)|for you right now|your (preferred|favorite) (brand|shampoo)|what matters (most )?to you (when|about|in))\b/i;

/** Clear assessor / in-role framing. */
const ASSESSOR_ANCHOR =
  /\b(as the [\w\s/-]{2,40}|sales associate|how would you (ask|handle|open|close|approach|respond|pitch|explain|discover|identify|probe|qualify)|a (shopper|customer) (says|pauses|approaches|asks)|shopper(?:'s)? (needs|concerns|objection)|tailor your (opening|pitch)|before recommending)\b/i;

export function looksLikeImmersiveCustomerPrompt(text: string): boolean {
  return IMMERSION_AS_CUSTOMER.test(text) || SOUNDS_LIKE_CUSTOMER_CHAT.test(text);
}

export function looksLikeBuyerPerspective(text: string): boolean {
  if (!BUYER_PERSPECTIVE.test(text)) return false;
  // "how would you ask what is important to them" is OK — still about the shopper
  if (/\b(them|their|the shopper|the customer|this shopper|this customer)\b/i.test(text) && ASSESSOR_ANCHOR.test(text)) {
    return false;
  }
  return true;
}

export function isOffPathAssessorUtterance(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (looksLikeImmersiveCustomerPrompt(t) || looksLikeBuyerPerspective(t)) return true;
  // Personal preference questions without role/situation anchor
  if (/\b(what|which).{0,40}\b(you|your)\b.{0,40}\b(prefer|like|want|need)\b/i.test(t) && !ASSESSOR_ANCHOR.test(t)) {
    return true;
  }
  return false;
}

/** Ensure a core question asks how the employee would handle a situation. */
export function ensureSituationalQuestion(text: string, roleLabel: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const role = roleLabel.trim() || "the assessed role";

  if (isOffPathAssessorUtterance(trimmed)) {
    return fallbackAssessorQuestion(role, trimmed);
  }

  return trimmed;
}

/**
 * Sanitize any live AI reply (core, follow-up, or improvised probe)
 * so the call never flips into interviewing the employee as a shopper.
 */
export function ensureAssessorUtterance(text: string, roleLabel: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const role = roleLabel.trim() || "the assessed role";

  if (!isOffPathAssessorUtterance(trimmed)) {
    // Soft reinforce only when clearly missing any situation/role cue
    if (
      trimmed.length > 100 &&
      !ASSESSOR_ANCHOR.test(trimmed) &&
      /\?/.test(trimmed) &&
      !/\b(okay|got it|thanks|alright|what would you|how would you)\b/i.test(trimmed)
    ) {
      return `Okay — ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
    }
    return trimmed;
  }

  return fallbackAssessorQuestion(role, trimmed);
}

function fallbackAssessorQuestion(role: string, original: string): string {
  if (/close|next step|undecided|commit/i.test(original)) {
    return `If the shopper still isn't sure, what would you say to close or set a next step?`;
  }
  if (/benefit|pitch|explain|30 seconds|position/i.test(original)) {
    return `How would you explain the main benefits in about thirty seconds?`;
  }
  if (/objection|hurry|brand I like|pushback/i.test(original)) {
    return `A shopper says they're in a hurry and already have a brand — what would you say?`;
  }
  if (/factor|important|concern|constraint|price|scent|hair type|decision/i.test(original)) {
    return `What would you ask to learn what matters most to this shopper before you recommend anything?`;
  }
  if (/open|approach|conversation|greet/i.test(original)) {
    return `A customer walks up — how would you open, and how would you find out what they need?`;
  }
  return `In that moment as ${role}, what would you do next to understand the shopper's needs?`;
}
