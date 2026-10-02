// Small inline icon set (1.5px stroke) — no icon library dependency.
type P = { className?: string; size?: number };
const S = ({ size = 16, className, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

export const IconPlus = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IconX = (p: P) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const IconTarget = (p: P) => <S {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.5" fill="currentColor" /></S>;
export const IconShield = (p: P) => <S {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /></S>;
export const IconBolt = (p: P) => <S {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" /></S>;
export const IconBook = (p: P) => <S {...p}><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z" /><path d="M8 7h7M8 11h5" /></S>;
export const IconImage = (p: P) => <S {...p}><rect x="3" y="4" width="18" height="16" rx="1" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></S>;
export const IconChat = (p: P) => <S {...p}><path d="M4 5h16v11H9l-5 4V5z" /></S>;
export const IconSearch = (p: P) => <S {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></S>;
export const IconChevron = (p: P) => <S {...p}><path d="M9 6l6 6-6 6" /></S>;
export const IconExternal = (p: P) => <S {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></S>;
export const IconSettings = (p: P) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></S>;
export const IconAlert = (p: P) => <S {...p}><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v5M12 18v.5" /></S>;
export const IconUsers = (p: P) => <S {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 4a3.5 3.5 0 010 7M18 14c2.4.6 4 2.8 4 6" /></S>;
export const IconLogout = (p: P) => <S {...p}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></S>;
export const IconCoin = (p: P) => <S {...p}><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></S>;
export const IconDiscord = (p: P) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" className={p.className} aria-hidden="true">
    <path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0015.4 3l-.6 1.3a18.3 18.3 0 00-5.6 0L8.6 3a19.7 19.7 0 00-4.9 1.4C.6 9 -.3 13.6.1 18.1a19.9 19.9 0 006 3l1.3-2a12.9 12.9 0 01-2-1l.5-.4a14.2 14.2 0 0012.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 006-3c.5-5.2-.8-9.8-3.6-13.7zM8.3 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7.4 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z" />
  </svg>
);
