import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AuditedEntity } from '../../common/entities/base.entity.js';
import { Brand } from '../../brands/entities/brand.entity.js';
import { MediaAsset } from './media-asset.entity.js';

// Folder untuk merapikan library media brand.
@Entity({ name: 'folders' })
@Index(['brandId', 'name'], { unique: true, where: '"deleted_at" IS NULL' })
export class Folder extends AuditedEntity {
  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.folders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Relation<Brand>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @OneToMany(() => MediaAsset, (asset) => asset.folder)
  mediaAssets: Relation<MediaAsset[]>;
}
