const WHISPER_URL = 'http://localhost:8787/transcribe';

export async function transcribeAudio(blob) {
  const form = new FormData();
  form.append('file', blob, 'recording.webm');

  const res = await fetch(WHISPER_URL, { method: 'POST', body: form });

  if (!res.ok) {
    throw new Error(`Transcription failed: ${res.status}`);
  }

  const { text } = await res.json();
  return text;
}
