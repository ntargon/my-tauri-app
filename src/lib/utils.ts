import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/**
 * フォントサイズに基づいて動的にサイズを計算するユーティリティ関数
 */
export interface ResponsiveSizes {
	textareaMinHeight: number;
	textareaMaxHeight: number;
	buttonHeight: number;
	padding: number;
	margin: number;
	iconSize: number;
}

/**
 * フォントサイズから各UI要素のサイズを計算
 */
export function calculateResponsiveSizes(fontSize: number): ResponsiveSizes {
	// ベースサイズ（14px時の値）
	const baseFontSize = 14;
	const scale = fontSize / baseFontSize;

	return {
		textareaMinHeight: Math.max(32, Math.round(40 * scale)),
		textareaMaxHeight: Math.max(64, Math.round(120 * scale)),
		buttonHeight: Math.max(28, Math.round(40 * scale)),
		padding: Math.max(4, Math.round(8 * scale)),
		margin: Math.max(2, Math.round(4 * scale)),
		iconSize: Math.max(12, Math.round(16 * scale))
	};
}
