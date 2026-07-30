import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const recognition: SpeechRecognitionLike = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalRef.current += `${result[0].transcript.trim()} `;
        } else {
          interimText += result[0].transcript;
        }
      }
      setTranscript(finalRef.current.trim());
      setInterim(interimText);
    };
    recognition.onerror = (event: any) => {
      setError(event?.error === "not-allowed" ? "Microphone permission denied." : "Speech recognition error.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const start = useCallback(() => {
    setError(null);
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
    setInterim("");
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  const setManualTranscript = useCallback((value: string) => {
    finalRef.current = value;
    setTranscript(value);
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset, setManualTranscript };
}
