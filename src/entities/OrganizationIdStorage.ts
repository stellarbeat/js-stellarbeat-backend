import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import {SnapShotUniqueIdentifier} from "./NodePublicKeyStorage";

/**
 * Stores the unique organization id's, regardless of versions.
 */
@Entity("organization_id")
export default class OrganizationIdStorage implements SnapShotUniqueIdentifier{

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    @Column("text", {nullable: false})
    @Index({unique: true})
    organizationId: string;

    @Column("timestamptz")
    dateDiscovered: Date;

    constructor(organizationId: string, dateDiscovered: Date) {
        this.organizationId = organizationId;
        this.dateDiscovered = dateDiscovered;
    }
}