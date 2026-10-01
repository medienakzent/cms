import { execFileSync } from 'node:child_process';
import {
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
	existsSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const cli = join(process.cwd(), 'bin', 'cms.js');
let root: string;

function run(...args: string[]): string {
	return execFileSync('node', [cli, ...args], {
		cwd: root,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	});
}

function manifest(): {
	version: string;
	files: Record<string, { hash: string; modified: boolean }>;
} {
	return JSON.parse(readFileSync(join(root, '.cms', 'manifest.json'), 'utf8'));
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'cms-cli-'));
	mkdirSync(join(root, 'src'), { recursive: true });
	writeFileSync(join(root, 'src', 'cms.config.ts'), 'export default {};\n');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('cms sync', () => {
	it('writes all stubs and a manifest', () => {
		run('sync', '--quiet');
		expect(existsSync(join(root, 'src', 'hooks.server.ts'))).toBe(true);
		const entries = Object.values(manifest().files);
		expect(entries.length).toBeGreaterThan(10);
		expect(entries.every((entry) => entry.modified === false)).toBe(true);
	});

	it('keeps customer-modified stubs and marks them, replaces them only with --force', () => {
		run('sync', '--quiet');
		const target = join(root, 'src', 'hooks.server.ts');
		const generated = readFileSync(target, 'utf8');
		writeFileSync(target, generated + '\n// customer change\n');

		run('sync', '--quiet');
		expect(readFileSync(target, 'utf8')).toContain('customer change');
		expect(manifest().files['src/hooks.server.ts'].modified).toBe(true);

		// The mark survives further syncs even though the stored hash matches the stub.
		run('sync', '--quiet');
		expect(readFileSync(target, 'utf8')).toContain('customer change');
		expect(() => run('check')).toThrow();

		run('sync', '--force', '--quiet');
		expect(readFileSync(target, 'utf8')).toBe(generated);
		expect(manifest().files['src/hooks.server.ts'].modified).toBe(false);
	});

	it('removes stubs that disappeared from the package only when unmodified', () => {
		run('sync', '--quiet');
		const data = manifest();
		data.files['src/routes/old-stub.ts'] = { hash: 'x', modified: false };
		writeFileSync(join(root, '.cms', 'manifest.json'), JSON.stringify(data));
		mkdirSync(join(root, 'src', 'routes'), { recursive: true });
		writeFileSync(join(root, 'src', 'routes', 'old-stub.ts'), 'customer content');
		run('sync', '--quiet');
		expect(existsSync(join(root, 'src', 'routes', 'old-stub.ts'))).toBe(true);
		expect(manifest().files['src/routes/old-stub.ts'].modified).toBe(true);
	});
});

describe('cms init', () => {
	it('creates the project with dotfiles and the update workflow', () => {
		const project = join(root, 'kunde');
		run('init', project, '--name', 'cms.kunde', '--quiet');
		expect(existsSync(join(project, '.gitignore'))).toBe(true);
		const workflow = readFileSync(join(project, '.github', 'workflows', 'cms-update.yml'), 'utf8');
		expect(workflow).toContain('npx cms update');
		expect(existsSync(join(project, '_github'))).toBe(false);
		const manifestFile = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
		expect(manifestFile.dependencies['@medienakzent/cms']).toMatch(/#release\/v\d+\.\d+\.\d+$/);
	});
});

describe('cms update', () => {
	it('leaves projects without release pins alone', () => {
		writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: {} }));
		expect(run('update', '--dry-run')).toContain('Alle Releases sind aktuell.');
	});
});

describe('cms init (plesk)', () => {
	it('creates an executable deploy script for Plesk', () => {
		const project = join(root, 'kunde');
		run('init', project, '--name', 'cms.kunde', '--quiet');
		const script = join(project, 'plesk-deploy.sh');
		expect(readFileSync(script, 'utf8')).toContain('touch tmp/restart.txt');
		expect(readFileSync(join(project, 'app.cjs'), 'utf8')).toContain("import('./build/index.js')");
		expect(statSync(script).mode & 0o111).not.toBe(0);
	});
});

describe('cms sync (operational files)', () => {
	it('creates missing operational files but never overwrites them', () => {
		writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'cms.kunde' }));
		writeFileSync(join(root, 'app.cjs'), '// eigene Fassung\n');
		run('sync', '--quiet');
		expect(readFileSync(join(root, 'app.cjs'), 'utf8')).toBe('// eigene Fassung\n');
		expect(statSync(join(root, 'plesk-deploy.sh')).mode & 0o111).not.toBe(0);
		expect(existsSync(join(root, '.github', 'workflows', 'cms-update.yml'))).toBe(true);
	});
});

describe('cms check (lockfile platforms)', () => {
	it('reports a lockfile without the Linux x64 packages', () => {
		run('sync', '--quiet');
		writeFileSync(
			join(root, 'package-lock.json'),
			JSON.stringify({
				packages: {
					'node_modules/rollup': {},
					'node_modules/@rollup/rollup-linux-arm64-gnu': {}
				}
			})
		);
		let output = '';
		try {
			run('check');
		} catch (error) {
			output = String((error as { stderr?: string }).stderr);
		}
		expect(output).toContain('@rollup/rollup-linux-x64-gnu');
	});
});
