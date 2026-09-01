"use client";

import { useEffect, useRef, useState } from "react";

// Minimal typings for the browser Web Speech API (not in lib.dom by default).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function VoiceButton({
  onFinalText,
  lang = "en-CA",
}: {
  // Called with each finalized chunk of speech; caller appends it to notes.
  onFinalText: (text: string) => void;
  lang?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  function start() {
    setError(null);
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onFinalText(text);
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission was denied.");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        setError(`Voice input error: ${e.error}`);
      }
      setRecording(false);
    };
    rec.onend = () => setRecording(false);

    recognitionRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setError("Could not start voice input.");
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  if (!supported) {
    return (
      <span className="footnote">
        Voice input is not available in this browser. Try Chrome or Edge.
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={`mic ${recording ? "recording" : ""}`}
        onClick={recording ? stop : start}
        aria-pressed={recording}
      >
        {recording ? (
          <>
            <span className="mic-dot" /> Stop dictating
          </>
        ) : (
          <>🎙️ Dictate notes</>
        )}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
