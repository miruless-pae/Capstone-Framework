import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AspectRatio, CommentLabelType } from '../common/enums.js';
import {
  AiProvider,
  BackgroundRemovalRequest,
  CaptionRequest,
  CommentClassification,
  GeneratedText,
  ImageRequest,
  StoredImage,
} from './ai-provider.js';

const SIZE_BY_RATIO: Record<AspectRatio, { width: number; height: number }> = {
  [AspectRatio.SQUARE]: { width: 1024, height: 1024 },
  [AspectRatio.PORTRAIT]: { width: 1024, height: 1280 },
  [AspectRatio.STORY]: { width: 576, height: 1024 },
};

const NEGATIVE_WORDS = ['not working', "isn't working", 'broken', 'bad', 'terrible', 'worst', 'scam', 'rusak', 'jelek', 'kecewa'];

// PROVIDER PALSU untuk development: tidak memanggil AI sungguhan. File yang dikembalikan
// hanya metadata (storage_key `mock/...` tidak benar-benar ada di storage). Ganti dengan
// provider nyata sebelum produksi.
@Injectable()
export class MockAiProvider extends AiProvider {
  async generateImage(request: ImageRequest): Promise<StoredImage> {
    const { width, height } = SIZE_BY_RATIO[request.aspectRatio];
    const id = randomUUID();
    return {
      storageKey: `mock/ai/${id}.png`,
      filename: `${id}.png`,
      mimeType: 'image/png',
      size: 250_000,
      width,
      height,
    };
  }

  async removeBackground(request: BackgroundRemovalRequest): Promise<StoredImage> {
    const id = randomUUID();
    return {
      storageKey: `mock/bg-removed/${id}.png`,
      filename: request.filename.replace(/\.[^.]+$/, '') + '-nobg.png',
      mimeType: 'image/png',
      size: 180_000,
      width: 1024,
      height: 1024,
    };
  }

  async generateCaption(request: CaptionRequest): Promise<GeneratedText> {
    const brandTag = request.brandName.replace(/[^a-z0-9]/gi, '');
    const industryTag = request.industry?.replace(/[^a-z0-9]/gi, '') || 'Brand';
    const voice = request.toneOfVoice ? ` (${request.toneOfVoice})` : '';
    return {
      caption: `${request.prompt.trim()} ✦${voice}`,
      hashtags: [brandTag, industryTag].filter(Boolean),
      model: 'mock-llm',
    };
  }

  async classifyComment(message: string): Promise<CommentClassification> {
    const text = message.toLowerCase();
    if (text.includes('?')) {
      return { label: CommentLabelType.QUESTION, confidence: 0.9, model: 'mock-sentiment' };
    }
    if (NEGATIVE_WORDS.some((word) => text.includes(word))) {
      return { label: CommentLabelType.NEGATIVE, confidence: 0.85, model: 'mock-sentiment' };
    }
    return { label: CommentLabelType.POSITIVE, confidence: 0.8, model: 'mock-sentiment' };
  }
}
