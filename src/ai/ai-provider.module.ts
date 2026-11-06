import { Module } from '@nestjs/common';
import { AiProvider } from './ai-provider.js';
import { MockAiProvider } from './mock-ai.provider.js';

// Satu tempat untuk menukar provider AI. Dipakai oleh ai-jobs, captions, dan comments.
@Module({
  providers: [
    // GANTI useClass dengan provider AI sungguhan saat sudah siap
    { provide: AiProvider, useClass: MockAiProvider },
  ],
  exports: [AiProvider],
})
export class AiProviderModule {}
