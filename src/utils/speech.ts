const SPEECH_RATE  = 0.9;
const SPEECH_PITCH = 1.0;

/** Speak text via the Web Speech API, cancelling any previous speech. No-op if unavailable. */
export function speakText(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate  = SPEECH_RATE;
  utterance.pitch = SPEECH_PITCH;
  window.speechSynthesis.speak(utterance);
}
