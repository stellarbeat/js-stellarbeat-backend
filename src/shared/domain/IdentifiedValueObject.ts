import { IdentifiedDomainObject } from './IdentifiedDomainObject';

//If you want to store a value object in database, but not expose its internal db id, use this class.
export abstract class IdentifiedValueObject extends IdentifiedDomainObject {}
