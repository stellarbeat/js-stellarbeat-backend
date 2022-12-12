import { IdentifiedDomainObject } from './IdentifiedDomainObject';

//If you want to store a domain entity in database, but not expose its internal db id, use this class.
export abstract class IdentifiedEntity extends IdentifiedDomainObject {}
