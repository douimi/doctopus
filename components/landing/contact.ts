/**
 * Contact + free-trial constants surfaced across the landing page.
 * Centralised so the phone number, message, and trial length update
 * in one place.
 */

export const WHATSAPP_NUMBER_DIGITS = '212628823717';
export const WHATSAPP_NUMBER_DISPLAY = '+212 628 823 717';
export const FREE_TRIAL_MONTHS = 3;

const WHATSAPP_MESSAGE = `Bonjour, je souhaite essayer Doctopus pendant ${FREE_TRIAL_MONTHS} mois gratuitement.`;

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export const SUPPORT_EMAIL = 'douimiotmane@gmail.com';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=Doctopus%20%E2%80%94%20demande%20d%27acc%C3%A8s`;
