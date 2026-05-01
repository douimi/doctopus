import { afterAll } from 'vitest';
import { __closeDbForTests } from '@/db/client';

export function registerDbCleanup() {
  afterAll(async () => {
    await __closeDbForTests();
  });
}
