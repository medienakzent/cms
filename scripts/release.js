#!/usr/bin/env node
/**
 * Publishes a prebuilt release of a Svelte package repository (this package or @compdata/ui):
 * the built `dist/` plus the files listed in package.json become one commit on the branch
 * `releases`, tagged `release/v<version>`. Projects install that tag, so npm neither runs
 * `prepare` nor installs devDependencies on the server.
 *
 *   docker exec -w /app cms-dev npm run package     # build dist first
 *   node scripts/release.js [repository] [--push]
 */
import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BRANCH = 'releases';
const EXTRA_FILES = ['README.md', 'LICENSE', 'CHANGELOG.md'];
/** Scripts that must still run when a project installs the release. */
const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];

const argumentsList = process.argv.slice(2);
const push = argumentsList.includes('--push');
const repository = resolve(argumentsList.find((argument) => !argument.startsWith('--')) ?? '.');

function git(gitArguments, options = {}) {
	return execFileSync('git', gitArguments, {
		cwd: repository,
		encoding: 'utf8',
		...options
	}).trim();
}

function fail(message) {
	console.error(`release: ${message}`);
	process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(repository, 'package.json'), 'utf8'));
const tag = `release/v${manifest.version}`;

if (git(['status', '--porcelain'])) fail('Arbeitsbaum ist nicht sauber.');
if (!existsSync(join(repository, 'dist'))) fail('dist/ fehlt — zuerst bauen (svelte-package).');
if (git(['tag', '--list', tag])) fail(`Tag ${tag} existiert bereits.`);
if (git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]))
	fail(`Tag ${tag} existiert bereits auf origin.`);
const source = git(['rev-parse', 'HEAD']);

const includes = (manifest.files ?? []).filter((entry) => !entry.startsWith('!'));
const excluded = (path) => /\.(test|spec)\.[^/]+$/.test(path);

const staging = mkdtempSync(join(tmpdir(), 'release-'));
const index = `${staging}.index`;
try {
	for (const entry of [...includes, ...EXTRA_FILES]) {
		const from = join(repository, entry);
		if (!existsSync(from)) {
			if (includes.includes(entry)) fail(`${entry} aus "files" fehlt.`);
			continue;
		}
		cpSync(from, join(staging, entry), {
			recursive: true,
			filter: (path) => !excluded(path)
		});
	}
	if (!readdirSync(join(staging, 'dist')).length) fail('dist/ ist leer.');

	const releaseManifest = { ...manifest };
	delete releaseManifest.devDependencies;
	releaseManifest.scripts = Object.fromEntries(
		Object.entries(manifest.scripts ?? {}).filter(([name]) => INSTALL_SCRIPTS.includes(name))
	);
	if (!Object.keys(releaseManifest.scripts).length) delete releaseManifest.scripts;
	writeFileSync(join(staging, 'package.json'), `${JSON.stringify(releaseManifest, null, '\t')}\n`);

	// Separate index and work tree: the checkout of the repository stays untouched.
	const environment = { ...process.env, GIT_INDEX_FILE: index };
	git(['read-tree', '--empty'], { env: environment });
	git(['--work-tree', staging, 'add', '--all', '--force', '.'], { env: environment });
	const tree = git(['write-tree'], { env: environment });

	try {
		git(['fetch', '--quiet', 'origin', `+refs/heads/${BRANCH}:refs/heads/${BRANCH}`], {
			stdio: ['ignore', 'pipe', 'ignore']
		});
	} catch {
		// First release: the branch does not exist on origin yet.
	}
	let parent = '';
	try {
		parent = git(['rev-parse', '--verify', '--quiet', `refs/heads/${BRANCH}`]);
	} catch {
		parent = '';
	}
	const commit = git([
		'commit-tree',
		tree,
		...(parent ? ['-p', parent] : []),
		'-m',
		`Release ${manifest.name} ${manifest.version}\n\nGebaut aus ${source}.`
	]);
	git(['update-ref', `refs/heads/${BRANCH}`, commit]);
	git(['tag', tag, commit]);
	console.log(`${tag} → ${commit.slice(0, 7)} (Quelle ${source.slice(0, 7)})`);

	if (push) {
		git(['push', 'origin', `refs/heads/${BRANCH}`, `refs/tags/${tag}`], { stdio: 'inherit' });
		const remote = git(['remote', 'get-url', 'origin']).match(/github\.com[:/](.+?)(\.git)?$/)?.[1];
		console.log(`Im Projekt: "${manifest.name}": "github:${remote}#${tag}"`);
	} else {
		console.log(`Noch nicht gepusht: git push origin ${BRANCH} ${tag}`);
	}
} finally {
	rmSync(staging, { recursive: true, force: true });
	rmSync(index, { force: true });
}
