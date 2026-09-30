export type SpeechRecognitionAlternativeLike = {
  transcript?: string;
  confidence?: number;
};

export type SpeechRecognitionResultLike = {
  isFinal?: boolean;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
};

export type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike | undefined>;
};

export function extractFinalSpeechTranscript(event: SpeechRecognitionEventLike) {
  const rawResultIndex = Number(event.resultIndex ?? 0);
  const startIndex = Number.isFinite(rawResultIndex) ? Math.max(0, Math.trunc(rawResultIndex)) : 0;

  let text = '';
  let confidence: number | null = null;

  for (let i = startIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (!result?.isFinal) continue;

    const alternative = result[0];
    text += String(alternative?.transcript ?? '');
    const candidateConfidence = Number(alternative?.confidence);
    confidence = Number.isFinite(candidateConfidence) ? candidateConfidence : confidence;
  }

  return {
    text: text.trim(),
    confidence,
  };
}
