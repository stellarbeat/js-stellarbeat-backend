import * as toml from 'toml';
import { OrganizationTomlFetcher } from '../OrganizationTomlFetcher';
import { mock } from 'jest-mock-extended';
import {
	TomlFetchError,
	TomlParseError,
	TomlService
} from '../../../network/scan/TomlService';
import { Logger } from '../../../../../core/services/PinoLogger';
import { TomlState } from '../TomlState';

describe('OrganizationTomlFetcher', () => {
	const tomlV2String =
		'FEDERATION_SERVER="https://api.domain.com/federation"\n' +
		'AUTH_SERVER="https://api.domain.com/auth"\n' +
		'TRANSFER_SERVER="https://api.domain.com"\n' +
		'SIGNING_KEY="GBBHQ7H4V6RRORKYLHTCAWP6MOHNORRFJSDPXDFYDGJB2LPZUFPXUEW3"\n' +
		'HORIZON_URL="https://horizon.domain.com"\n' +
		'\n' +
		'ACCOUNTS=[\n' +
		'"GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3",\n' +
		'"GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7",\n' +
		'"GAOO3LWBC4XF6VWRP5ESJ6IBHAISVJMSBTALHOQM2EZG7Q477UWA6L7U"\n' +
		']\n' +
		'\n' +
		'VERSION="2.0.0"\n' +
		'\n' +
		'[DOCUMENTATION]\n' +
		'ORG_NAME="Organization Name"\n' +
		'ORG_DBA="Organization DBA"\n' +
		'ORG_URL="https://www.organization.com"\n' +
		'ORG_LOGO="https://www.organization.com/awesomelogo.jpg"\n' +
		'ORG_DESCRIPTION="Description of issuer"\n' +
		'ORG_PHYSICAL_ADDRESS="123 Sesame Street, New York, NY 12345, United States"\n' +
		'ORG_PHYSICAL_ADDRESS_ATTESTATION="https://www.domain.com/address_attestation.jpg"\n' +
		'ORG_PHONE_NUMBER="1 (123)-456-7890"\n' +
		'ORG_PHONE_NUMBER_ATTESTATION="https://www.domain.com/phone_attestation.jpg"\n' +
		'ORG_KEYBASE="keybase"\n' +
		'ORG_TWITTER="twitter"\n' +
		'ORG_GITHUB="github"\n' +
		'ORG_OFFICIAL_EMAIL="support@domain.com"\n' +
		'\n' +
		'[[PRINCIPALS]]\n' +
		'name="Jane Jedidiah Johnson"\n' +
		'email="jane@domain.com"\n' +
		'keybase="keybasek"\n' +
		'twitter="twittert"\n' +
		'github="githubg"\n' +
		'id_photo_hash="be688838ca8686e5c90689bf2ab585cef1137c999b48c70b92f67a5c34dc15697b5d11c982ed6d71be1e1e7f7b4e0733884aa97c3f7a339a8ed03577cf74be09"\n' +
		'verification_photo_hash="016ba8c4cfde65af99cb5fa8b8a37e2eb73f481b3ae34991666df2e04feb6c038666ebd1ec2b6f623967756033c702dde5f423f7d47ab6ed1827ff53783731f7"\n' +
		'\n' +
		'[[CURRENCIES]]\n' +
		'code="USD"\n' +
		'issuer="GCZJM35NKGVK47BB4SPBDV25477PZYIYPVVG453LPYFNXLS3FGHDXOCM"\n' +
		'display_decimals=2\n' +
		'\n' +
		'[[CURRENCIES]]\n' +
		'code="BTC"\n' +
		'issuer="GAOO3LWBC4XF6VWRP5ESJ6IBHAISVJMSBTALHOQM2EZG7Q477UWA6L7U"\n' +
		'display_decimals=7\n' +
		'anchor_asset_type="crypto"\n' +
		'anchor_asset="BTC"\n' +
		'redemption_instructions="Use SEP6 with our federation server"\n' +
		'collateral_addresses=["2C1mCx3ukix1KfegAY5zgQJV7sanAciZpv"]\n' +
		'collateral_address_signatures=["304502206e21798a42fae0e854281abd38bacd1aeed3ee3738d9e1446618c4571d10"]\n' +
		'\n' +
		'# asset with meta info\n' +
		'[[CURRENCIES]]\n' +
		'code="GOAT"\n' +
		'issuer="GD5T6IPRNCKFOHQWT264YPKOZAWUMMZOLZBJ6BNQMUGPWGRLBK3U7ZNP"\n' +
		'display_decimals=2\n' +
		'name="goat share"\n' +
		'desc="1 GOAT token entitles you to a share of revenue from Elkins Goat Farm."\n' +
		'conditions="There will only ever be 10,000 GOAT tokens in existence. We will distribute the revenue share annually on Jan. 15th"\n' +
		'image="https://pbs.twimg.com/profile_images/666921221410439168/iriHah4f.jpg"\n' +
		'fixed_number=10000\n' +
		'\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-au"\n' +
		'DISPLAY_NAME="Domain Australia"\n' +
		'HOST="core-au.domain.com:11625"\n' +
		'PUBLIC_KEY="GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_001/"\n' +
		'\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-sg"\n' +
		'DISPLAY_NAME="Domain Singapore"\n' +
		'HOST="core-sg.domain.com:11625"\n' +
		'PUBLIC_KEY="GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_002/"\n' +
		'\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-us"\n' +
		'DISPLAY_NAME="Domain United States"\n' +
		'HOST="core-us.domain.com:11625"\n' +
		'PUBLIC_KEY="GAOO3LWBC4XF6VWRP5ESJ6IBHAISVJMSBTALHOQM2EZG7Q477UWA6L7U"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_003/"\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-other"\n' +
		'DISPLAY_NAME="Domain Other"\n' +
		'HOST="core-other.domain.com:11625"\n' +
		'PUBLIC_KEY="GBH"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_003/"';

	const tomlV2Object = toml.parse(tomlV2String);

	function createFetcher(
		mockResultMap: Map<string, Record<string, unknown> | TomlFetchError>
	) {
		const tomlService = mock<TomlService>();
		const logger = mock<Logger>();
		tomlService.fetchTomlObjects.mockResolvedValue(mockResultMap);

		return new OrganizationTomlFetcher(tomlService, logger);
	}

	test('fetchOrganizationTomlInfo', async () => {
		const fetcher = createFetcher(new Map([['my-domain', tomlV2Object]]));

		const result = await fetcher.fetchOrganizationTomlInfoCollection([
			'my-domain'
		]);
		expect(result.size).toBe(1);
		const info = result.get('my-domain');
		expect(info).toBeDefined();
		if (!info) return;
		expect(info.name).toBe('Organization Name');
		expect(info.validators).toEqual([
			'GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI',
			'GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7',
			'GAOO3LWBC4XF6VWRP5ESJ6IBHAISVJMSBTALHOQM2EZG7Q477UWA6L7U'
		]);
		expect(info.dba).toBe('Organization DBA');
		expect(info.url).toBe('https://www.organization.com');
		expect(info.keybase).toBe('keybase');
		expect(info.twitter).toBe('twitter');
		expect(info.github).toBe('github');
		expect(info.horizonUrl).toEqual('https://horizon.domain.com');
		expect(info.phoneNumber).toBe('1 (123)-456-7890');
		expect(info.officialEmail).toBe('support@domain.com');
		expect(info.description).toBe('Description of issuer');
		expect(info.physicalAddress).toBe(
			'123 Sesame Street, New York, NY 12345, United States'
		);
		expect(info.state).toBe(TomlState.Ok);
	});

	it('should map TomlFetchError to correct TomlState', async function () {
		const error = new TomlFetchError(
			'test',
			new TomlParseError(new Error('test'))
		);

		const fetcher = createFetcher(new Map([['my-domain', error]]));

		const result = await fetcher.fetchOrganizationTomlInfoCollection([
			'my-domain'
		]);

		expect(result.size).toBe(1);
		const info = result.get('my-domain');
		expect(info).toBeDefined();
		if (!info) return;
		expect(info.state).toBe(TomlState.ParsingError);
	});

	it('should set correct state for unsupported version', async function () {
		const tomlV2Object = toml.parse(tomlV2String);
		tomlV2Object.VERSION = '1.0.0';
		const fetcher = createFetcher(new Map([['my-domain', tomlV2Object]]));

		const result = await fetcher.fetchOrganizationTomlInfoCollection([
			'my-domain'
		]);

		expect(result.size).toBe(1);
		const info = result.get('my-domain');
		expect(info).toBeDefined();
		if (!info) return;
		expect(info.state).toBe(TomlState.UnsupportedVersion);
	});
});
