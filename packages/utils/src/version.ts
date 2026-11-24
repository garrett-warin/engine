declare const GROVE_EXPECTED_VERSION: string;
declare const CONTROLLER_EXPECTED_VERSION: string;

function assertVersionMatch(
	packageName: string,
	expected: string,
	actual: string
) {
	if (expected !== actual) {
		throw new Error(
			`${packageName} version mismatch: this build expects ${expected}, but the loaded runtime is ${actual}`
		);
	}
}

export function assertDependencyVersions() {
	if (typeof $grove === "undefined") {
		console.error(
			"@mercuryworkshop/grove is not loaded. Load grove before grove-utils."
		);
	}

	assertVersionMatch(
		"@mercuryworkshop/grove",
		GROVE_EXPECTED_VERSION,
		$grove.versionInfo.version
	);

	if (typeof $groveController === "undefined") {
		console.error(
			"@mercuryworkshop/grove-controller is not loaded. Load the controller before grove-utils."
		);
	}

	assertVersionMatch(
		"@mercuryworkshop/grove-controller",
		CONTROLLER_EXPECTED_VERSION,
		$groveController.VERSION
	);
}
