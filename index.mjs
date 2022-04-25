import JestHasteMap from 'jest-haste-map';
import { cpus } from 'os';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Worker } from 'jest-worker';
import chalk from 'chalk';

import { runTest } from './worker.js';

/**
 * I. Efficiently search for test files on the file system
 */

// Get the root path to our project (Like `__dirname`).
const root = dirname(fileURLToPath(import.meta.url));

// Need to use `.default` as of Jest 27.
const hasteMap = new JestHasteMap.default({
	extensions: ['js'], // Tells jest-haste-map to only crawl .js files.
	maxWorkers: cpus().length, // Parallelizes across all available CPUs.
	name: 'test-framework', // Used for caching.
	platforms: [], // This is only used for React Native, leave empty.
	rootDir: root, // The project root.
	roots: [root], // Can be used to only search a subset of files within `rootDir`.
});

// Build and return an in-memory HasteFS ("Haste File System") instance.
const { hasteFS } = await hasteMap.build();

// const testFiles = hasteFS.matchFilesWithGlob(['**/*.test.js']);
const testFiles = hasteFS.matchFilesWithGlob([
	process.argv[2] ? `**/${process.argv[2]}*` : '**/*.test.js',
]);

/**
 * II. Run all the tests in parallel
 */

const worker = new Worker(join(root, 'worker.js'), {
	enableWorkerThreads: true,
});

let hasFailed = false;

await Promise.all(
	Array.from(testFiles).map(async (testFile) => {
		const { success, errorMessage, testResults } = await worker.runTest(testFile);
		const status = success
			? chalk.green.inverse.bold(' PASS ')
			: chalk.red.inverse.bold(' FAIL ');

		// console.log(status + ' ' + chalk.dim(relative(root, testFile)));

		// if (!success) {
		// 	hasFailed = true;
		// 	console.log(`  ${errorMessage}`);
		// }

		console.log(status + ' ' + chalk.dim(relative(root, testFile)));
		if (!success) {
			hasFailed = true;
			// Make use of the rich testResults and error messages.
			if (testResults) {
				testResults
					.filter((result) => result.errors.length)
					.forEach((result) =>
						console.log(
							// Skip the first part of the path which is an internal token.
							result.testPath.slice(1).join(' ') + '\n' + result.errors[0]
						)
					);
				// If the test crashed before `jest-circus` ran, report it here.
			} else if (errorMessage) {
				console.log(`  ${errorMessage}`);
			}
		}
	})
);

worker.end(); // Shut down the worker.

if (hasFailed) {
	console.log(
		'\n' + chalk.red.bold('Test run failed, please fix all the failing tests.')
	);
	// Set an exit code to indicate failure.
	process.exitCode = 1;
}
