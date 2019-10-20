import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity("public_key")
export default class PublicKeyStorage{

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    @Column("varchar", {length: 56})
    @Index({unique: true})
    publicKey: string;

    constructor(publicKey: string) {
        this.publicKey = publicKey;
    }
}