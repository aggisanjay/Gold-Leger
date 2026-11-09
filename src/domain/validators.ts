export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
/** BIS hallmark unique ID: six alphanumeric characters. */
export const HUID_RE = /^[A-Z0-9]{6}$/;
export const PHONE_RE = /^[6-9]\d{9}$/;

export const isPan = (s: string) => PAN_RE.test(s.trim().toUpperCase());
export const isHuid = (s: string) => HUID_RE.test(s.trim().toUpperCase());
export const isPhone = (s: string) => PHONE_RE.test(s.trim());
