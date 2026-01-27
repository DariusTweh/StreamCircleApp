// theme.js

export const colors = {
  background: '#0f172a',        // deep navy background
  card: '#1e293b',              // slightly lighter dark for containers
  textPrimary: '#f8fafc',       // near-white for primary text
  textSecondary: '#cbd5e1',     // soft light gray for secondary info
  textMuted: '#94a3b8',         // muted text like placeholders
  accent: '#facc15',            // warm premium yellow
  accentText: '#1e293b',        // for contrast when text is over accent
  buttonPrimary: '#facc15',     // buttons like "Watch Now"
  buttonPrimaryText: '#1e293b', // text over yellow buttons
  buttonSecondary: '#2563eb',   // optional secondary (blue) button
  buttonSecondaryText: '#f8fafc',
  border: '#334155',            // subtle dividers
  danger: '#ef4444',            // red for errors/warnings
};

export const typography = {
  heading: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.textSecondary,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textPrimary,
  },
  muted: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
};
