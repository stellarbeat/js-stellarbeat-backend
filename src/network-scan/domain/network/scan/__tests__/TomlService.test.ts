import valueValidator from 'validator';

import { TomlService } from '../TomlService';
import { Node, Organization } from '@stellarbeat/js-stellarbeat-shared';
import * as toml from 'toml';
import { HttpService } from '../../../../../core/services/HttpService';
import { ok } from 'neverthrow';
import { LoggerMock } from '../../../../../core/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';

const httpService = mock<HttpService>();
let tomlService: TomlService;
beforeEach(() => {
	tomlService = new TomlService(httpService, new LoggerMock());
});
const node = new Node(
	'GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI'
);
node.homeDomain = 'my-domain.com';
node.active = true;
node.quorumSet.validators.push('z');

const otherNode = new Node('GBH');
otherNode.homeDomain = 'other-domain';

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
	'ORG_URL="https://www.domain.com"\n' +
	'ORG_LOGO="https://www.domain.com/awesomelogo.jpg"\n' +
	'ORG_DESCRIPTION="Description of issuer"\n' +
	'ORG_PHYSICAL_ADDRESS="123 Sesame Street, New York, NY 12345, United States"\n' +
	'ORG_PHYSICAL_ADDRESS_ATTESTATION="https://www.domain.com/address_attestation.jpg"\n' +
	'ORG_PHONE_NUMBER="1 (123)-456-7890"\n' +
	'ORG_PHONE_NUMBER_ATTESTATION="https://www.domain.com/phone_attestation.jpg"\n' +
	'ORG_KEYBASE="accountname"\n' +
	'ORG_TWITTER="orgtweet"\n' +
	'ORG_GITHUB="orgcode"\n' +
	'ORG_OFFICIAL_EMAIL="support@domain.com"\n' +
	'\n' +
	'[[PRINCIPALS]]\n' +
	'name="Jane Jedidiah Johnson"\n' +
	'email="jane@domain.com"\n' +
	'keybase="crypto_jane"\n' +
	'twitter="crypto_jane"\n' +
	'github="crypto_jane"\n' +
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
tomlV2Object.domain = 'my-domain.com';

test('fetchToml', async () => {
	httpService.get.mockReturnValue(
		new Promise((resolve) =>
			resolve(
				ok({
					data: tomlV2String,
					status: 200,
					statusText: 'ok',
					headers: {}
				})
			)
		)
	);

	const tomlResult = await tomlService.fetchToml('my-domain.com');
	expect(tomlResult.isOk()).toBeTruthy();
	if (tomlResult.isErr()) return;
	expect(tomlResult.value).toEqual(tomlV2Object);
});
test('fetchTomls', async () => {
	httpService.get.mockReturnValue(
		new Promise((resolve) =>
			resolve(
				ok({
					data: tomlV2String,
					status: 200,
					statusText: 'ok',
					headers: {}
				})
			)
		)
	);

	const toml = await tomlService.fetchTomlObjects([node]);
	expect(toml).toEqual([tomlV2Object]);
});

const node2 = new Node(
	'GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7'
);
node2.homeDomain = 'my-domain.com';
node2.active = true;
node2.quorumSet.validators.push('z');

test('updateValidator', () => {
	tomlService.updateOrganizationsAndNodes(
		[tomlV2Object],
		[],
		[node2, otherNode],
		[]
	);
	expect(node2.historyUrl).toEqual(
		'http://history.domain.com/prd/core-live/core_live_002/'
	);
	expect(node2.alias).toEqual('domain-sg');
	expect(node2.name).toEqual('Domain Singapore');
	expect(node2.host).toEqual('core-sg.domain.com:11625');
});

test('updateOrganizations', () => {
	const tomlOrgObject = toml.parse(tomlV2String);
	tomlOrgObject.domain = 'my-domain.com';
	const organization = new Organization(
		'c1ca926603dc454ba981aa514db8402b',
		'New Organization Name'
	);
	organization.validators.push(
		'GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI'
	);
	organization.dba = 'Organization DBA';
	organization.url = 'https://www.domain.com';
	organization.logo = 'https://www.domain.com/awesomelogo.jpg';
	organization.description = 'Description of issuer';
	organization.physicalAddress =
		'123 Sesame Street, New York, NY 12345, United States';
	organization.phoneNumber = '1 (123)-456-7890';
	organization.keybase = 'accountname';
	organization.twitter = 'orgtweet';
	organization.github = 'orgcode';
	organization.officialEmail = 'support@domain.com';
	organization.horizonUrl = 'https://horizon.domain.com';
	organization.homeDomain = 'my-domain.com';

	const orgs = tomlService.updateOrganizationsAndNodes(
		[tomlOrgObject],
		[organization],
		[node, otherNode],
		[]
	);

	expect(orgs).toEqual([organization]);
	expect(node.organizationId).toEqual(organization.id);
	expect(otherNode.organizationId).toBeNull();
});

test('getOrganizationWithFilteredOutUrls', () => {
	const tomlOrgString =
		'[DOCUMENTATION]\n' +
		'DOMAIN="domain.com"\n' +
		'ORG_NAME="Organization Name"\n' +
		'ORG_DBA="Organization DBA"\n' +
		'ORG_URL="https://www.domain.com"\n' +
		'ORG_LOGO="https://www.domain.com/awesomelogo.jpg"\n' +
		'ORG_DESCRIPTION="Description of issuer"\n' +
		'ORG_PHYSICAL_ADDRESS="123 Sesame Street, New York, NY 12345, United States"\n' +
		'ORG_PHYSICAL_ADDRESS_ATTESTATION="https://www.domain.com/address_attestation.jpg"\n' +
		'ORG_PHONE_NUMBER="1 (123)-456-7890"\n' +
		'ORG_PHONE_NUMBER_ATTESTATION="https://www.domain.com/phone_attestation.jpg"\n' +
		'ORG_KEYBASE="https://keybase.io/accountname"\n' +
		'ORG_TWITTER="https://twitter.com/orgtweet"\n' +
		'ORG_GITHUB="https://github.com/orgcode"\n' +
		'ORG_OFFICIAL_EMAIL="support@domain.com"';
	const tomlOrgObject = toml.parse(tomlOrgString);
	tomlOrgObject.domain = 'domain.com';
	const anotherTomlOrgString = '[DOCUMENTATION]\n' + 'ORG_NAME="Another org"\n';
	const anotherTomlOrgObject = toml.parse(anotherTomlOrgString);
	anotherTomlOrgObject.domain = 'other.domain.com';
	const organization = new Organization(
		'c1ca926603dc454ba981aa514db8402b',
		'Organization Name'
	);
	organization.dba = 'Organization DBA';
	organization.url = 'https://www.domain.com';
	organization.logo = 'https://www.domain.com/awesomelogo.jpg';
	organization.description = 'Description of issuer';
	organization.physicalAddress =
		'123 Sesame Street, New York, NY 12345, United States';
	organization.phoneNumber = '1 (123)-456-7890';
	organization.keybase = 'accountname';
	organization.twitter = 'orgtweet';
	organization.github = 'orgcode';
	organization.officialEmail = 'support@domain.com';
	organization.homeDomain = 'domain.com';

	const updatedOrganizations = tomlService.updateOrganizationsAndNodes(
		[tomlOrgObject, anotherTomlOrgObject],
		[organization],
		[],
		[]
	);

	expect(updatedOrganizations).toContainEqual(organization);
	expect(updatedOrganizations).toHaveLength(2);
});

test('organization adds and removes validator', () => {
	let tomlOrgString =
		'[DOCUMENTATION]\n' +
		'\n' +
		'ORG_NAME="Organization Name"\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-sg"\n' +
		'DISPLAY_NAME="Domain Singapore"\n' +
		'HOST="core-sg.domain.com:11625"\n' +
		'PUBLIC_KEY="GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_002/"\n';

	let tomlOrgObject = toml.parse(tomlOrgString);
	tomlOrgObject.domain = 'domain.com';

	const organization = new Organization(
		'c1ca926603dc454ba981aa514db8402b',
		'Organization Name'
	);
	organization.homeDomain = 'domain.com';

	const node1 = new Node(
		'GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7'
	);
	node1.organizationId = 'c1ca926603dc454ba981aa514db8402b';
	node1.homeDomain = 'domain.com';

	let updatedOrganizations = tomlService.updateOrganizationsAndNodes(
		[tomlOrgObject],
		[organization],
		[node1],
		[]
	);
	expect(updatedOrganizations[0].validators).toHaveLength(1);
	expect(node1.organizationId).toEqual(organization.id);

	//add validator
	tomlOrgString =
		'[DOCUMENTATION]\n' +
		'\n' +
		'ORG_NAME="Organization Name"\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-au"\n' +
		'DISPLAY_NAME="Domain Australia"\n' +
		'HOST="core-au.domain.com:11625"\n' +
		'PUBLIC_KEY="GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_001/"\n' +
		'\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-sg"\n' +
		'DISPLAY_NAME="Domain Singapore"\n' +
		'HOST="core-sg.domain.com:11625"\n' +
		'PUBLIC_KEY="GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_002/"\n';
	tomlOrgObject = toml.parse(tomlOrgString);
	tomlOrgObject.domain = 'domain.com';
	const node2 = new Node(
		'GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3'
	);
	node2.organizationId = 'c1ca926603dc454ba981aa514db8402b';
	node2.homeDomain = 'domain.com';
	updatedOrganizations = tomlService.updateOrganizationsAndNodes(
		[tomlOrgObject],
		[organization],
		[node1, node2],
		[]
	);
	expect(updatedOrganizations[0].validators).toEqual([
		'GD5DJQDDBKGAYNEAXU562HYGOOSYAEOO6AS53PZXBOZGCP5M2OPGMZV3',
		'GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7'
	]);
	expect(node1.organizationId).toEqual(organization.id);
	expect(node2.organizationId).toEqual(organization.id);

	//remove validator
	tomlOrgString =
		'[DOCUMENTATION]\n' +
		'\n' +
		'ORG_NAME="Organization Name"\n' +
		'\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-sg"\n' +
		'DISPLAY_NAME="Domain Singapore"\n' +
		'HOST="core-sg.domain.com:11625"\n' +
		'PUBLIC_KEY="GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_002/"\n';
	tomlOrgObject = toml.parse(tomlOrgString);
	tomlOrgObject.domain = 'domain.com';
	updatedOrganizations = tomlService.updateOrganizationsAndNodes(
		[tomlOrgObject],
		[organization],
		[node1, node2],
		[]
	);
	expect(updatedOrganizations[0].validators).toEqual([
		'GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7'
	]);
	expect(node1.organizationId).toEqual(organization.id);
	expect(node2.organizationId).toBeNull();
});

test('node switches orgs', () => {
	const node1 = new Node(
		'GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7'
	);
	node1.homeDomain = 'domain.com'; //domain of new organization.
	const node2 = new Node('B');
	node2.homeDomain = 'previous.com';
	const previousOrganization = new Organization('previous', 'previous');
	node1.organizationId = previousOrganization.id;
	node2.organizationId = previousOrganization.id;
	previousOrganization.validators.push(node1.publicKey);
	previousOrganization.validators.push(node2.publicKey);
	const organization = new Organization(
		'c1ca926603dc454ba981aa514db8402b',
		'Organization Name'
	);
	organization.homeDomain = 'domain.com';
	//add validator
	const tomlOrgString =
		'[DOCUMENTATION]\n' +
		'\n' +
		'ORG_NAME="Organization Name"\n' +
		'[[VALIDATORS]]\n' +
		'ALIAS="domain-sg"\n' +
		'DISPLAY_NAME="Domain Singapore"\n' +
		'HOST="core-sg.domain.com:11625"\n' +
		'PUBLIC_KEY="GAENZLGHJGJRCMX5VCHOLHQXU3EMCU5XWDNU4BGGJFNLI2EL354IVBK7"\n' +
		'HISTORY="http://history.domain.com/prd/core-live/core_live_002/"\n';
	const tomlOrgObject = toml.parse(tomlOrgString);
	tomlOrgObject.domain = 'domain.com';
	tomlService.updateOrganizationsAndNodes(
		[tomlOrgObject],
		[organization, previousOrganization],
		[node1, node2],
		[]
	);

	expect(previousOrganization.validators[0]).toEqual('B');
});

test('homeDomain validation', () => {
	const domains = [
		'stellar.protocoh.com',
		'apay.io',
		'mobius.network',
		'www.renaudkyllian.ovh',
		'stellar.coray.org',
		'xdr.com',
		'paywith.glass',
		'bac.gold',
		'keybase.io',
		'stablecoincorp.com',
		'auskunft.de',
		'alphavirtual.com',
		'astrograph.io',
		'publicnode.org',
		'fchain.io',
		'stellar.sui.li',
		'stellar.blockchain.com',
		'lobstr.co',
		'lapo.io',
		'protocoh.com',
		'www.auskunft.de',
		'lumenswap.io',
		'intrastellar.io',
		'aldana.cz',
		'node.xdr.com',
		'aworld.org',
		'stellar.blockdaemon.com',
		'sakkex.network',
		'coinqvest.com',
		'satoshipay.io',
		'validator.stellar.expert',
		'www.stellar.org',
		'stellar.weizenbaum.net',
		'stablecoin.group',
		'armajeddon.com',
		'helpcoin.io',
		'hawking.network',
		'cowrie.exchange',
		'futuretense.io',
		'solid.to',
		'stellar.lockerx.co.uk',
		'schunk.net',
		'bd-trust.org',
		'stellar.smoove.net',
		'archive-stellar.worldwire.io',
		'stellarmint.io',
		'hellenium.com',
		'stellar.expert',
		'wirexapp.com',
		'overcat.me'
	];

	expect(domains.every((domain) => valueValidator.isFQDN(domain))).toBeTruthy();
	expect(valueValidator.isFQDN('https://stellar.org')).toBeFalsy();
});

it('should not update description', function () {
	const tomlWithEmptyStrings =
		'\n' +
		'[DOCUMENTATION]\n' +
		'ORG_NAME="Muyu Network"\n' +
		'ORG_DESCRIPTION=""\n' +
		'ORG_PHYSICAL_ADDRESS=""\n' +
		'ORG_PHYSICAL_ADDRESS_ATTESTATION=""\n' +
		'ORG_PHONE_NUMBER=""\n' +
		'ORG_PHONE_NUMBER_ATTESTATION=""\n' +
		'ORG_URL="https://fchain.io"\n' +
		'ORG_LOGO="https://fchain.io/logo.png"\n' +
		'ORG_GITHUB="fchainio"\n' +
		'ORG_OFFICIAL_EMAIL="hello@fchain.io"\n' +
		'ORG_SUPPORT_EMAIL="support@fchain.io"\n';
	const tomlObjectWithEmptyStrings = toml.parse(tomlWithEmptyStrings);

	const organization = new Organization('1', 'name');
	tomlService.updateOrganization(organization, tomlObjectWithEmptyStrings);

	expect(organization.description).toEqual('');
});

it('should return err when toml file cannot be parsed', async function () {
	const httpServiceMock = {
		get: jest.fn().mockResolvedValue(ok({ data: '<html></html>' }))
	} as unknown as HttpService;

	const mockedTomlService = new TomlService(httpServiceMock, new LoggerMock());
	const result = await mockedTomlService.fetchToml('home.com');
	expect(result.isErr()).toBeTruthy();
});
