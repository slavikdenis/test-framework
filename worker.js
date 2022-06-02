const vm = require('vm');
const fs = require('fs');
const NodeEnvironment = require('jest-environment-node').default;
const { dirname, basename, join } = require('path');

/**
 * III. Use an assertion framework for writing tests and report results
 */
const expect = require('expect').default;
const mock = require('jest-mock');
const { describe, it, run, resetState } = require('jest-circus');

// const expect = (received) => ({
// 	toBe: (expected) => {
// 		if (received !== expected) {
// 			throw new Error(`Expected "${expected}" but received "${received}".`);
// 		}
// 		return true;
// 	},
// 	toBeGreaterThan: (expected) => {
// 		if (received < expected) {
// 			throw new Error(
// 				`Expected "${expected}" to be greater than "${received}".`
// 			);
// 		}
// 		return true;
// 	},
// 	toContain: (expected) => {
// 		if (typeof expected === 'string' && !expected.includes(received)) {
// 			// String
// 			throw new Error(`Expected "${expected}" to contain "${received}".`);
// 		} else if (Array.isArray(expected) && !expected.includes(received)) {
// 			// Array
// 			throw new Error(
// 				`Expected "${JSON.stringify(expected)}" to contain "${received}".`
// 			);
// 		}
// 		return true;
// 	},
// });

// const mock = {
// 	fn: (implementation) => {
// 		const mockFn = () => {
// 			implementation?.();
// 			mockFn.mock.calls.push([]);
// 		};
// 		mockFn._isMockFunction = true;
// 		mockFn.getMockName = () => 'mockFn';
// 		mockFn.mock = {};
// 		mockFn.mock.calls =
// 			'calls' in mockFn.mock ? mockFn.mock.calls.push([]) : [];
// 		mockFn.mock.calls.count = () => mockFn.mock.calls.length;
// 		return mockFn;
// 	},
// };

exports.runTest = async function (testFile) {
	const testResult = {
		success: false,
		testResults: null,
		errorMessage: null,
	};

	// let testName = ''; // keep track of the current test

	// Don't let a failing tests crash other ones
	try {
		const code = await fs.promises.readFile(testFile, 'utf8');

		// const describeFns = [];
		// let currentDescribeFn;
		// const describe = (name, fn) => describeFns.push([name, fn]);
		// const it = (name, fn) => currentDescribeFn.push([name, fn]);

		resetState();

		// eval(code);

		// https://nodejs.org/docs/latest-v16.x/api/vm.html#vm-executing-javascript
		// const context = { describe, it, expect, mock };
		// vm.createContext(context);
		// vm.runInContext(code, context);

		/**
		 * IV. Isolate tests from each other
		 */

		let environment;
		const customRequire = (fileName) => {
			const code = fs.readFileSync(join(dirname(testFile), fileName), 'utf8');
			// return vm.runInContext(
			// 	// Define a module variable, run the code and "return" the exports object.
			// 	'const module = {exports: {}};\n' + code + ';module.exports;',
			// 	environment.getVmContext()
			// );

			// Define a function in the `vm` context and return it.
			// const moduleFactory = vm.runInContext(
			// 	`(function(module) {${code}})`,
			// 	environment.getVmContext()
			// );
			// const module = { exports: {} };
			// // Run the sandboxed function with our module object.
			// moduleFactory(module);
			// return module.exports;

			const moduleFactory = vm.runInContext(
				// Inject require as a variable here.
				`(function(module, require) {${code}})`,
				environment.getVmContext()
			);
			const module = { exports: {} };
			// And pass customRequire into our moduleFactory.
			moduleFactory(module, customRequire);
			return module.exports;
		};

		// environment = new NodeEnvironment({
		// 	testEnvironmentOptions: {
		// 		describe,
		// 		it,
		// 		expect,
		// 		mock,
		// 		// Add the custom require implementation as a global function.
		// 		require: customRequire,
		// 	},
		// });
		// vm.runInContext(code, environment.getVmContext());

		environment = new NodeEnvironment({
			projectConfig: {
				testEnvironmentOptions: {
					describe,
					it,
					expect,
					mock,
				},
			},
		});
		// Use `customRequire` to run the test file.
		customRequire(basename(testFile));

		// Run jest-circus.
		const { testResults } = await run();
		testResult.testResults = testResults;
		testResult.success = testResults.every((result) => !result.errors.length);

		// for (const [name, fn] of describeFns) {
		// 	currentDescribeFn = [];
		// 	testName = name;
		// 	fn();

		// 	currentDescribeFn.forEach(([name, fn]) => {
		// 		testName += ` ${name}`;
		// 		fn();
		// 	});
		// }

		// testResult.success = true;
	} catch (error) {
		// Something went wrong
		// if (!!testName) {
		// 	testResult.errorMessage = `"${testName}"\n${error.message}`;
		// } else {
		testResult.errorMessage = error.message;
		// }
	}

	return testResult;
};
