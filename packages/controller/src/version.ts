declare const GROVE_EXPECTED_VERSION: string;
declare const CONTROLLER_VERSION: string;

export const VERSION = CONTROLLER_VERSION;

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

export function assertRuntimeGroveVersion() {
	if (typeof $grove === "undefined") {
		throw new Error(
			"@mercuryworkshop/grove is not loaded. Load grove before the controller."
		);
	}

	assertVersionMatch(
		"@mercuryworkshop/grove",
		GROVE_EXPECTED_VERSION,
		$grove.versionInfo.version
	);
}
