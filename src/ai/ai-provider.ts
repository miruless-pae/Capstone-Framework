import { AiModel, AiStyle, AspectRatio, CommentLabelType } from '../common/enums.js';

// Gambar hasil AI yang SUDAH tersimpan di object storage. Provider yang sungguhan bertugas
// mengunggah hasilnya ke storage lalu mengembalikan metadatanya; database hanya menyimpan itu.
export interface StoredImage {
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

export interface ImageRequest {
  prompt: string;
  model: AiModel;
  style: AiStyle | null;
  toneOfVoice: string | null;
  aspectRatio: AspectRatio;
  referenceStorageKey: string | null;
}

export interface BackgroundRemovalRequest {
  sourceStorageKey: string;
  filename: string;
}

export interface CaptionRequest {
  prompt: string;
  brandName: string;
  industry: string | null;
  toneOfVoice: string | null;
}

export interface GeneratedText {
  caption: string;
  hashtags: string[];
  model: string;
}

export interface CommentClassification {
  label: CommentLabelType;
  confidence: number; // 0..1
  model: string;
}

// Titik sambung ke layanan AI sungguhan (FLUX Schnell, SDXL, Pollinations, LLM untuk caption
// dan sentimen). Ganti implementasinya di AiProviderModule tanpa mengubah service/controller.
export abstract class AiProvider {
  abstract generateImage(request: ImageRequest): Promise<StoredImage>;
  abstract removeBackground(request: BackgroundRemovalRequest): Promise<StoredImage>;
  abstract generateCaption(request: CaptionRequest): Promise<GeneratedText>;
  abstract classifyComment(message: string): Promise<CommentClassification>;
}
