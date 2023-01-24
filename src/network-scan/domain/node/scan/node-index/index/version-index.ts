import { diff, gt, clean } from 'semver';

/**
 * Index for node type (full validator, basic validator or watcher node)
 */
export class VersionIndex {
	protected static preClean(version: string) {
		version = version.replace(/\(.*\)/, '');
		version = version.replace(/^.*?([0-9].*)/, '$1');

		return version;
	}

	static get(
		stellarCoreVersion: string,
		latestStellarCoreVersion: string
	): number {
		const version = clean(VersionIndex.preClean(stellarCoreVersion), {
			loose: true
		}); //get release candidates
		if (!version) {
			return 0;
		}
		if (gt(version, latestStellarCoreVersion)) {
			//release candidates higher than current stable
			return 1;
		}

		switch (diff(version, latestStellarCoreVersion)) {
			case undefined:
				return 1;
			case null:
				return 1;
			case 'patch':
				return 0.8;
			case 'prepatch':
				return 0.8;
			case 'minor':
				return 0.6;
			case 'preminor':
				return 0.6;
			case 'major':
				return 0.3;
			case 'premajor':
				return 0.3;
			case 'prerelease':
				return 0.8;
			default:
				return 0;
		}
	}
}
