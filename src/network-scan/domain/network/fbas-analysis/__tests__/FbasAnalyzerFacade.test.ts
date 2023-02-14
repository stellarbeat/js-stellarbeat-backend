import 'reflect-metadata';
import FbasAnalyzerFacade, {
	FbasAnalysisNode,
	FbasAnalysisOrganization,
	MergeBy
} from '../FbasAnalyzerFacade';

describe('FbasAnalyzerFacade', () => {
	function getFBASNodes() {
		const node1: FbasAnalysisNode = {
			publicKey: 'GAA',
			name: 'GAA',
			geoData: {
				countryName: 'Netherlands'
			},
			isp: 'Cloudflare',
			quorumSet: {
				threshold: 2,
				validators: ['GAA', 'GBB', 'GCC'],
				innerQuorumSets: []
			}
		};

		const node2: FbasAnalysisNode = {
			publicKey: 'GBB',
			name: 'GBB',
			geoData: {
				countryName: 'Netherlands'
			},
			isp: 'Cloudflare',
			quorumSet: {
				threshold: 2,
				validators: ['GAA', 'GBB', 'GCC'],
				innerQuorumSets: []
			}
		};

		const node3: FbasAnalysisNode = {
			publicKey: 'GCC',
			name: 'GCC',
			geoData: {
				countryName: 'Netherlands'
			},
			isp: 'Cloudflare',
			quorumSet: {
				threshold: 2,
				validators: ['GAA', 'GBB', 'GCC'],
				innerQuorumSets: []
			}
		};
		return { node1, node2, node3 };
	}

	it('should analyze top tier nodes', () => {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeTopTier([node1, node2, node3], [], null);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.top_tier).toEqual(['GAA', 'GBB', 'GCC']);
			expect(result.value.top_tier_size).toEqual(3);
		}
	});

	function getFBASOrganizations(
		node1: FbasAnalysisNode,
		node2: FbasAnalysisNode,
		node3: FbasAnalysisNode
	) {
		const organization1: FbasAnalysisOrganization = {
			name: 'organization1',
			id: 'organization1',
			validators: [node1.publicKey, node2.publicKey]
		};

		const organization2: FbasAnalysisOrganization = {
			name: 'organization2',
			id: 'organization2',
			validators: [node3.publicKey]
		};

		return [organization1, organization2];
	}

	it('should analyze top tier organizations', function () {
		const { node1, node2, node3 } = getFBASNodes();
		const organizations = getFBASOrganizations(node1, node2, node3);

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeTopTier(
			[node1, node2, node3],
			organizations,
			MergeBy.ORGANIZATION
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.top_tier).toEqual(['organization1', 'organization2']);
			expect(result.value.top_tier_size).toEqual(2);
		}
	});

	it('should analyze top tier countries', function () {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeTopTier(
			[node1, node2, node3],
			[],
			MergeBy.COUNTRY
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.top_tier).toEqual(['Netherlands']);
			expect(result.value.top_tier_size).toEqual(1);
		}
	});

	it('should analyze top tier ISPs', function () {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeTopTier(
			[node1, node2, node3],
			[],
			MergeBy.ISP
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.top_tier).toEqual(['Cloudflare']);
			expect(result.value.top_tier_size).toEqual(1);
		}
	});

	it('should analyze blocking set nodes', () => {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeBlockingSets(
			[node1, node2, node3],
			[node1.publicKey],
			[],
			null
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.result).toEqual([['GBB'], ['GCC']]);
			expect(result.value.min).toEqual(1);
			expect(result.value.size).toEqual(2);
		}
	});

	it('should analyze blocking set organizations', () => {
		const { node1, node2, node3 } = getFBASNodes();
		const organizations = getFBASOrganizations(node1, node2, node3);

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeBlockingSets(
			[node1, node2, node3],
			[node1.publicKey],
			organizations,
			MergeBy.ORGANIZATION
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.result).toEqual([
				['organization1'],
				['organization2']
			]);
			expect(result.value.min).toEqual(1);
			expect(result.value.size).toEqual(2);
		}
	});

	it('should analyze blocking set countries', () => {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeBlockingSets(
			[node1, node2, node3],
			[node1.publicKey],
			[],
			MergeBy.COUNTRY
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.result).toEqual([['Netherlands']]);
			expect(result.value.min).toEqual(1);
			expect(result.value.size).toEqual(1);
		}
	});

	it('should analyze blocking set ISPs', () => {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeBlockingSets(
			[node1, node2, node3],
			[node1.publicKey],
			[],
			MergeBy.ISP
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.result).toEqual([['Cloudflare']]);
			expect(result.value.min).toEqual(1);
			expect(result.value.size).toEqual(1);
		}
	});

	it('should analyze splitting sets nodes', function () {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeSplittingSets(
			[node1, node2, node3],
			[],
			null
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.result).toEqual([['GAA'], ['GBB'], ['GCC']]);
			expect(result.value.min).toEqual(1);
			expect(result.value.size).toEqual(3);
		}
	});

	it('should analyze splitting sets organizations', function () {
		const { node1, node2, node3 } = getFBASNodes();
		const organizations = getFBASOrganizations(node1, node2, node3);

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeSplittingSets(
			[node1, node2, node3],
			organizations,
			MergeBy.ORGANIZATION
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.result).toEqual([
				['organization1'],
				['organization2']
			]);
			expect(result.value.min).toEqual(1);
			expect(result.value.size).toEqual(2);
		}
	});

	it('should analyze splitting sets countries', function () {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeSplittingSets(
			[node1, node2, node3],
			[],
			MergeBy.COUNTRY
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.result).toEqual([['Netherlands']]);
			expect(result.value.min).toEqual(1);
			expect(result.value.size).toEqual(1);
		}
	});

	it('should analyze splitting sets ISPs', function () {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeSplittingSets(
			[node1, node2, node3],
			[],
			MergeBy.ISP
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.result).toEqual([['Cloudflare']]);
			expect(result.value.min).toEqual(1);
			expect(result.value.size).toEqual(1);
		}
	});

	it('should analyze symmetric top tier nodes', function () {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeSymmetricTopTier(
			[node1, node2, node3],
			[],
			null
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value.symmetric_top_tier).toEqual({
				threshold: 2,
				validators: ['GAA', 'GBB', 'GCC']
			});
		}
	});

	it('should analyze minimal quorums nodes', function () {
		const { node1, node2, node3 } = getFBASNodes();

		const analyzer = new FbasAnalyzerFacade();
		const result = analyzer.analyzeMinimalQuorums(
			[node1, node2, node3],
			[],
			null
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isOk()) {
			expect(result.value).toEqual({
				min: 2,
				quorum_intersection: true,
				result: [
					['GAA', 'GBB'],
					['GAA', 'GCC'],
					['GBB', 'GCC']
				],
				size: 3
			});
		}
	});
});
