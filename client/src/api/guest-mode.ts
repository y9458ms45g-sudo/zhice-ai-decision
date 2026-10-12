export const GUEST_FLAG_KEY = 'zhice_guest_mode';

export function isGuestMode(): boolean {
  return localStorage.getItem(GUEST_FLAG_KEY) === '1' && !localStorage.getItem('zhice_token');
}

export function enterGuestMode(): void {
  localStorage.setItem(GUEST_FLAG_KEY, '1');
}

export function exitGuestMode(): void {
  localStorage.removeItem(GUEST_FLAG_KEY);
}
