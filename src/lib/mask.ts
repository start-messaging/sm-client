/**
 * Privacy-light masking for resumed flows: enough for the owner to recognise
 * their own address ("v•••@gmail.com"), nothing useful to a shoulder-surfer.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.length > 1 ? local[0] : '';
  return `${visible}•••${domain}`;
}
