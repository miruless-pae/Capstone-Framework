import { AfterLoad, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AuditedEntity } from '../../common/entities/base.entity.js';
import { MediaOrigin, MediaType } from '../../common/enums.js';
import { numberTransformer } from '../../common/utils/transformers.js';
import { publicUrl } from '../../common/utils/storage.js';
import { Brand } from '../../brands/entities/brand.entity.js';
import { Folder } from './folder.entity.js';

// Semua file masuk ke sini, apa pun asalnya (galeri, AI, Canva, hapus background).
// File aslinya ada di object storage; database hanya menyimpan metadata + storage_key.
@Entity({ name: 'media_assets' })
@Index(['brandId', 'createdAt'])
export class MediaAsset extends AuditedEntity {
  @Column({ name: 'brand_id', type: 'uuid' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.mediaAssets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Relation<Brand>;

  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId: string | null;

  @ManyToOne(() => Folder, (folder) => folder.mediaAssets, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'folder_id' })
  folder: Relation<Folder> | null;

  @Column({ type: 'enum', enum: MediaType, default: MediaType.IMAGE })
  type: MediaType;

  @Column({ type: 'enum', enum: MediaOrigin, default: MediaOrigin.GALLERY })
  origin: MediaOrigin;

  // path objek di storage, mis. "brands/<brandId>/2026/10/abc.png"
  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  // ukuran file dalam byte
  @Column({ type: 'bigint', transformer: numberTransformer })
  size: number;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  // durasi video dalam detik
  @Column({ type: 'int', nullable: true })
  duration: number | null;

  // storage_key gambar thumbnail (untuk video / gambar besar)
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail: string | null;

  // Bukan kolom: URL publik dihitung dari storage_key setiap kali entity dimuat.
  url?: string | null;
  thumbnailUrl?: string | null;

  @AfterLoad()
  buildUrls() {
    this.url = publicUrl(this.storageKey);
    this.thumbnailUrl = publicUrl(this.thumbnail);
  }
}
