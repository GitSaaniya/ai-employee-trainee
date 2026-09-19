/**
 * Keeps assessment questions in situational-judgment form.
 * Rejects immersive "you are the customer" phrasing that pulls the call off-path.
 */

const IMMERSION_AS_CUSTOMER =
  /\b(what brings you|your day at the mall|beauty aisle today|how(?:'s| is) your (?:day|shopping)|looking for today|can I help you find)\b/i;

const SOUNDS_LIKE_CUSTOMER_CHAT =
  /\b(tell me (a bit )?about your day|weekend (at|in) the mall|browsing (the )?(aisle|shelf))\b/i;

export function looksLikeImmersiveCustomerPrompt(text: string): boolean {
  return IMMERSION_AS_CUSTOMER.test(text) || SOUNDS_LIKE_CUSTOMER_CHAT.test(text);
}

/** Ensure a core question asks how the employee would handle a situation. */
export function ensureSituationalQuestion(text: string, roleLabel: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const role = roleLabel.trim() || "the assessed role";

  if (looksLikeImmersiveCustomerPrompt(trimmed)) {
    return `A customer approaches you at work. As the ${role}, how would you open the conversation and understand what they need?`;
  }

  return trimmed;
}
