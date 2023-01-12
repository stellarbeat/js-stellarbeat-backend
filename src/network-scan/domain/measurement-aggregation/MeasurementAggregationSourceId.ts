import PublicKey from '../node/PublicKey';
import { NetworkId } from '../network/NetworkId';
import { OrganizationId } from '../organization/OrganizationId';

export type MeasurementAggregationSourceId =
	| PublicKey
	| NetworkId
	| OrganizationId;
