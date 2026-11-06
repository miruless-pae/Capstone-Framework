import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PlatformPublisher, PublishResult } from './platform-publisher.js';

// PUBLISHER PALSU untuk development: tidak mengirim apa pun ke platform sungguhan,
// hanya menganggap publish berhasil. Ganti dengan implementasi nyata sebelum produksi.
@Injectable()
export class MockPlatformPublisher extends PlatformPublisher {
  async publish(): Promise<PublishResult> {
    return { platformPostId: `mock_${randomUUID()}`, platformUrl: null };
  }
}
