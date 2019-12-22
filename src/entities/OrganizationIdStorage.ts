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

    constructor(organizationId: string) {
        this.organizationId = organizationId;
    }
}