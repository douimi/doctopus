import { describe, expect, it } from 'vitest';
import { quickRepliesSchema, sendMessageSchema, uploadRequestSchema } from '@/lib/messaging/schemas';
import { displayName, shortName } from '@/lib/messaging/types';

const ids = {
  id: '00000000-0000-4000-8000-000000000001',
  conversationId: '00000000-0000-4000-8000-000000000002',
};
const PATIENT = '00000000-0000-4000-8000-000000000003';
const file = { path: 't/c/x.jpg', name: 'analyse.jpg', mime: 'image/jpeg', bytes: 1000 };

describe('sendMessageSchema', () => {
  it('accepts text, a patient-only mention, and a quick reply', () => {
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'text', body: ' Bonjour ' }).data?.body).toBe('Bonjour');
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'text', body: '', patientId: PATIENT }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'quick', body: 'Patient suivant' }).success).toBe(true);
  });

  it('rejects empty text, empty quick replies and attachments on text', () => {
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'text', body: '   ' }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'quick', body: '' }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'text', body: 'x', attachment: file }).success).toBe(false);
  });

  it('attachments: photo/PDF only, ≤10 Mo; voice needs audio + duration', () => {
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'attachment', attachment: file }).success).toBe(true);
    expect(
      sendMessageSchema.safeParse({
        ...ids,
        kind: 'attachment',
        attachment: { ...file, mime: 'application/x-msdownload' },
      }).success,
    ).toBe(false);
    expect(
      sendMessageSchema.safeParse({ ...ids, kind: 'attachment', attachment: { ...file, bytes: 11 * 1024 * 1024 } })
        .success,
    ).toBe(false);
    const voice = { ...file, mime: 'audio/webm;codecs=opus', name: 'note.webm' };
    const ok = sendMessageSchema.safeParse({ ...ids, kind: 'voice', attachment: voice, voiceDurationMs: 4200 });
    expect(ok.success).toBe(true);
    expect(ok.data?.attachment?.mime).toBe('audio/webm');
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'voice', attachment: voice }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ ...ids, kind: 'voice', attachment: file, voiceDurationMs: 10 }).success).toBe(
      false,
    );
  });

  it('upload requests validate mime and size', () => {
    expect(uploadRequestSchema.safeParse({ conversationId: ids.conversationId, mime: 'application/pdf', bytes: 5 }).success).toBe(true);
    expect(uploadRequestSchema.safeParse({ conversationId: ids.conversationId, mime: 'text/html', bytes: 5 }).success).toBe(false);
  });

  it('quick replies are trimmed and bounded', () => {
    expect(quickRepliesSchema.safeParse([{ label: ' A ', body: ' B ' }]).data).toEqual([{ label: 'A', body: 'B' }]);
    expect(quickRepliesSchema.safeParse([{ label: 'x'.repeat(33), body: 'B' }]).success).toBe(false);
    expect(quickRepliesSchema.safeParse([{ label: 'A', body: '' }]).success).toBe(false);
  });
});

describe('names', () => {
  it('doctors read as "Dr …", assistants by first name in short form', () => {
    expect(displayName({ fullName: 'Karim Alaoui', role: 'doctor' })).toBe('Dr Karim Alaoui');
    expect(displayName({ fullName: 'Dr Karim Alaoui', role: 'doctor' })).toBe('Dr Karim Alaoui');
    expect(shortName({ fullName: 'Karim Alaoui', role: 'doctor' })).toBe('Dr Alaoui');
    expect(shortName({ fullName: 'Docteur Alaoui', role: 'doctor' })).toBe('Dr Alaoui');
    expect(shortName({ fullName: 'Salma Tazi', role: 'assistant' })).toBe('Salma');
    expect(displayName({ fullName: 'Salma Tazi', role: 'assistant' })).toBe('Salma Tazi');
  });
});
