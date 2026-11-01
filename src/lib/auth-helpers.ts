/** Helpers de autenticação puros — seguros para uso no cliente e no servidor. */

export function isGmail(email: string): boolean {
  return /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(email.trim());
}
