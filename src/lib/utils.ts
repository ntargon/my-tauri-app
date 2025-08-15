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
	inputHeight: number;
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
		inputHeight: Math.max(16, Math.round(fontSize + 8)),
		buttonHeight: Math.max(16, Math.round(fontSize + 8)),
		padding: Math.max(2, Math.round(4 * scale)),
		margin: Math.max(1, Math.round(2 * scale)),
		iconSize: Math.max(12, Math.round(16 * scale))
	};
}
