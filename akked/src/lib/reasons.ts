export const CANCEL_REASONS = ['wrong_number', 'changed_mind', 'too_expensive', 'fake', 'other', 'unspecified'] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];
