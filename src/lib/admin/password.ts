/**
 * Strong passwords in the style of Apple's generator: three pronounceable groups of six
 * characters separated by hyphens, exactly one capital letter and one digit, e.g.
 * `kamvub-Dowcix-zebru7`. About 71 bits of entropy from the browser's cryptographic random source.
 * Letters that are easily confused (l, o) and the digits 0 and 1 are left out.
 */
const CONSONANTS = 'bcdfghjkmnpqrstvwxz';
const VOWELS = 'aeiu';
const DIGITS = '23456789';
/** Consonant/vowel pattern of one group: pronounceable without forming real words. */
const GROUP_PATTERN = 'cvccvc';
const GROUPS = 3;

/** Uniform random integer in [0, max) without modulo bias. */
function randomIndex(max: number): number {
	const limit = Math.floor(0x100000000 / max) * max;
	const buffer = new Uint32Array(1);
	do crypto.getRandomValues(buffer);
	while (buffer[0] >= limit);
	return buffer[0] % max;
}

const pick = (characters: string) => characters[randomIndex(characters.length)];

export function generatePassword(): string {
	const groups = Array.from({ length: GROUPS }, () =>
		Array.from(GROUP_PATTERN, (kind) => pick(kind === 'c' ? CONSONANTS : VOWELS))
	);
	// Like Apple: the digit sits at the start or the end of a group.
	const digitGroup = randomIndex(GROUPS);
	const digitPosition = randomIndex(2) === 0 ? 0 : GROUP_PATTERN.length - 1;
	groups[digitGroup][digitPosition] = pick(DIGITS);

	const letterPositions = groups.flatMap((group, groupIndex) =>
		group.flatMap((_, position) =>
			groupIndex === digitGroup && position === digitPosition ? [] : [[groupIndex, position]]
		)
	);
	const [capitalGroup, capitalPosition] = letterPositions[randomIndex(letterPositions.length)];
	groups[capitalGroup][capitalPosition] = groups[capitalGroup][capitalPosition].toUpperCase();

	return groups.map((group) => group.join('')).join('-');
}
