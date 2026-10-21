export type AssistantState =
  | { kind: 'disabled' }
  | { kind: 'no_api_key' }
  | { kind: 'no_credits'; balance: number }
  | {
      kind: 'ready';
      balance: number;
      disclaimerAcknowledged: boolean;
    };

/** Why the assistant can't be used (tooltip copy), or null when it can. */
export function assistantUnavailableReason(state: AssistantState): string | null {
  switch (state.kind) {
    case 'disabled':
      return 'non activé pour ce cabinet. Contactez le support.';
    case 'no_api_key':
      return "aucune clé API configurée. Contactez votre administrateur.";
    case 'no_credits':
      return 'crédits IA épuisés. Contactez votre administrateur pour recharger.';
    default:
      return null;
  }
}
