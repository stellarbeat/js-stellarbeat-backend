import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    Index,
    JoinTable, ManyToMany
} from "typeorm";
import OrganizationIdStorage from "./OrganizationIdStorage";
import {Organization} from "@stellarbeat/js-stellar-domain";
import NodePublicKeyStorage from "./NodePublicKeyStorage";
import {SnapShot} from "./NodeSnapShot";
import OrganizationMeasurement from "./OrganizationMeasurement";
import {
    OrganizationMeasurementAverage,
} from "../repositories/OrganizationMeasurementRepository";

/**
 * Contains all versions of all organizations
 */
@Entity()
export default class OrganizationSnapShot implements SnapShot {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column("timestamptz", {nullable: false})
    @Index()
    public startDate: Date;

    @Column("timestamptz", {nullable: false})
    @Index()
    public endDate: Date = OrganizationSnapShot.MAX_DATE;

    @Index()
    @ManyToOne(type => OrganizationIdStorage, {nullable: false, cascade: ['insert'], eager: true})
    protected _organizationIdStorage?: OrganizationIdStorage;

    //undefined if not retrieved from database.
    @ManyToMany(type => NodePublicKeyStorage, {nullable: false, cascade: ['insert'], eager: true})
    @JoinTable({name: 'organization_snap_shot_validators_node_public_key'})
    protected _validators?: NodePublicKeyStorage[];

    @Column('text', {nullable: false, name: "name"})
    protected _name?: string;

    @Column('text', {nullable: true})
    dba: string | null = null;

    @Column('text', {nullable: true})
    url: string | null = null;

    @Column('text', {nullable: true})
    officialEmail: string | null = null;

    @Column('text', {nullable: true})
    phoneNumber: string | null = null;

    @Column('text', {nullable: true})
    physicalAddress: string | null = null;

    @Column('text', {nullable: true})
    twitter: string | null = null;

    @Column('text', {nullable: true})
    github: string | null = null;

    @Column('text', {nullable: true})
    description: string | null = null;

    @Column('text', {nullable: true})
    keybase: string | null = null;

    static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

    constructor(organizationIdStorage: OrganizationIdStorage, startDate: Date) {
        this.organizationIdStorage = organizationIdStorage;
        this.startDate = startDate;
    }

    set validators(validators: NodePublicKeyStorage[]) {
        this._validators = validators;
    }

    get validators() {
        if (this._validators === undefined) {
            throw new Error('Validators not loaded from database');
        }

        return this._validators;
    }

    get name() {
        if (this._name === undefined) {
            throw new Error('name not loaded from database');
        }

        return this._name;
    }

    set name(value:string) {
        this._name = value;
    }

    set organizationIdStorage(organizationIdStorage: OrganizationIdStorage) {
        this._organizationIdStorage = organizationIdStorage;
    }

    get organizationIdStorage() {
        if (this._organizationIdStorage === undefined) {
            throw new Error('organizationIdStorage not loaded from database');
        }

        return this._organizationIdStorage;
    }

    organizationChanged(organization: Organization) {
        return this.organizationIdStorage.organizationId != organization.id
            || this.name != organization.name
            || this.dba != organization.dba
            || this.url != organization.url
            || this.officialEmail != organization.officialEmail
            || this.phoneNumber != organization.phoneNumber
            || this.physicalAddress != organization.physicalAddress
            || this.twitter != organization.twitter
            || this.github != organization.github
            || this.description != organization.description
            || this.keybase != organization.keybase
            || this.validatorsChanged(organization)
    }

    validatorsChanged(organization: Organization) {
        let validatorPublicKeys = this.validators.map(validator => validator.publicKey);

        if (validatorPublicKeys.length !== organization.validators.length)
            return true;
        if (!validatorPublicKeys.every(publicKey => organization.validators.includes(publicKey)))
            return true;

        return !validatorPublicKeys.every(publicKey => organization.validators.includes(publicKey));
    }

    toOrganization( //todo: move to factory
        time: Date,
        measurement?: OrganizationMeasurement,
        measurement24HourAverage?: OrganizationMeasurementAverage,
        measurement30DayAverage?: OrganizationMeasurementAverage) {

        let organization = new Organization(this.organizationIdStorage.organizationId, this.name);

        organization.dateDiscovered = this.organizationIdStorage.dateDiscovered;
        if (this.dba) organization.dba = this.dba;
        if (this.url) organization.url = this.url;
        if (this.officialEmail) organization.officialEmail = this.officialEmail;
        organization.officialEmail = undefined;
        if (this.phoneNumber) organization.phoneNumber = this.phoneNumber;
        if (this.physicalAddress) organization.physicalAddress = this.physicalAddress;
        if (this.twitter) organization.twitter = this.twitter;
        if (this.github) organization.github = this.github;
        if (this.description) organization.description = this.description;
        if (this.keybase) organization.keybase = this.keybase;
        this.validators.forEach(validator => {
            organization.validators.push(validator.publicKey);
        });

        if (measurement) {
            organization.subQuorumAvailable = measurement.isSubQuorumAvailable;
        }

        if (measurement24HourAverage) {
            organization.subQuorum24HoursAvailability = measurement24HourAverage.isSubQuorumAvailableAvg;
        }

        if (measurement30DayAverage) {
            organization.has30DayStats = true;
            organization.subQuorum30DaysAvailability = measurement30DayAverage.isSubQuorumAvailableAvg;
        } else {
            organization.has30DayStats = false;
        }

        return organization;
    }

    isActive(){
        return this.endDate.getTime() === OrganizationSnapShot.MAX_DATE.getTime();
    }

    //todo: map to domain object
    toJSON():Object {
        return {
            startDate: this.startDate,
            endDate: this.endDate,
            id: this.organizationIdStorage.organizationId,
            validators: this.validators.map(validator => validator.publicKey),
            name: this.name,
            dba: this.dba,
            url: this.url,
            officialEmail: this.officialEmail,
            phoneNumber: this.phoneNumber,
            physicalAddress: this.physicalAddress,
            twitter: this.twitter,
            github: this.github,
            description: this.description,
            keybase: this.keybase
        }
    }
}