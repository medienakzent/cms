import { describe, expect, it } from 'vitest';
import {
	addDays,
	browserOf,
	channelOf,
	deviceOf,
	isBot,
	languageOf,
	localTime,
	normalizePath,
	osOf,
	referrerHost
} from './classify';

const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const WINDOWS_EDGE =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0';

describe('analytics classification', () => {
	it('keeps only plain site paths', () => {
		expect(normalizePath('/about/?utm_source=x#top')).toBe('/about');
		expect(normalizePath('/')).toBe('/');
		expect(normalizePath('//evil.example')).toBeNull();
		expect(normalizePath('https://example.com/')).toBeNull();
		expect(normalizePath(42)).toBeNull();
	});

	it('reduces referrers to external hosts', () => {
		expect(referrerHost('https://www.google.de/search?q=secret', 'example.com')).toBe('google.de');
		expect(referrerHost('https://www.example.com/page', 'example.com')).toBe('');
		expect(referrerHost('javascript:alert(1)', 'example.com')).toBe('');
	});

	it('assigns channels', () => {
		expect(channelOf('', '')).toBe('direct');
		expect(channelOf('google.de', '')).toBe('search');
		expect(channelOf('l.instagram.com', '')).toBe('social');
		expect(channelOf('partner.example', '')).toBe('referral');
		expect(channelOf('google.de', 'newsletter')).toBe('campaign');
	});

	it('classifies devices, browsers and systems coarsely', () => {
		expect(deviceOf(IPHONE, null)).toBe('mobile');
		expect(deviceOf(WINDOWS_EDGE, '?0')).toBe('desktop');
		expect(browserOf(IPHONE)).toBe('Safari');
		expect(browserOf(WINDOWS_EDGE)).toBe('Edge');
		expect(osOf(IPHONE)).toBe('iOS');
		expect(osOf(WINDOWS_EDGE)).toBe('Windows');
		expect(isBot('Googlebot/2.1')).toBe(true);
		expect(isBot(IPHONE)).toBe(false);
		expect(languageOf('de-DE,de;q=0.9,en;q=0.8')).toBe('de');
	});

	it('counts days in the configured time zone', () => {
		expect(localTime(new Date('2026-03-31T22:30:00Z'), 'Europe/Berlin')).toEqual({
			day: '2026-04-01',
			hour: 0
		});
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
	});
});
