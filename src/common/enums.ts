// Semua enum dipakai bersama oleh entity (kolom enum PostgreSQL) dan DTO.

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

// Platform yang bisa dihubungkan ke brand. TikTok dan LinkedIn menyusul.
export enum Platform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  THREADS = 'threads',
}

// Pemilik token di tabel oauth_tokens: akun sosial (platform) atau akun Canva.
export enum OAuthProvider {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  THREADS = 'threads',
  CANVA = 'canva',
}

const PROVIDER_BY_PLATFORM: Record<Platform, OAuthProvider> = {
  [Platform.FACEBOOK]: OAuthProvider.FACEBOOK,
  [Platform.INSTAGRAM]: OAuthProvider.INSTAGRAM,
  [Platform.THREADS]: OAuthProvider.THREADS,
};

// Token sebuah social_account disimpan di oauth_tokens dengan provider yang sama dengan platformnya.
export function providerOf(platform: Platform): OAuthProvider {
  return PROVIDER_BY_PLATFORM[platform];
}

export enum SocialAccountStatus {
  CONNECTED = 'connected',
  EXPIRED = 'expired',
  DISCONNECTED = 'disconnected',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

// Dari mana file berasal. Semua masuk ke media_assets.
export enum MediaOrigin {
  GALLERY = 'gallery',
  IMAGE_AI = 'image_ai',
  CANVA = 'canva',
  BACKGROUND_REMOVAL = 'background_removal',
}

export enum PostType {
  POST = 'post',
  STORY = 'story',
  REEL = 'reel',
}

export enum PostScheduleStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export enum CommentLabelType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  QUESTION = 'question',
}

export enum AiJobType {
  GENERATE_IMAGE = 'generate_image',
  REGENERATE_IMAGE = 'regenerate_image',
  REMOVE_BACKGROUND = 'remove_background',
  CAPTION = 'caption',
  SENTIMENT = 'sentiment',
}

export enum AiJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Opsi layar "Create with AI". Disimpan sebagai teks di ai_jobs.input_json.
export enum AiModel {
  FLUX_SCHNELL = 'flux-schnell',
  SDXL = 'sdxl',
  POLLINATIONS = 'pollinations',
}

export enum AiStyle {
  REALISTIC = 'realistic',
  ILLUSTRATION = 'illustration',
  MINIMAL = 'minimal',
  VIBRANT = 'vibrant',
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '4:5',
  STORY = '9:16',
}
