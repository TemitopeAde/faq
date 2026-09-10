import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: Array<string | undefined | false>): string => twMerge(inputs.filter(Boolean).join(' '));
