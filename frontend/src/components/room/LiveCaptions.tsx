"use client";

import { useEffect, useRef, useState } from "react";
import { Captions } from "lucide-react";

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function LiveCaptions() {
  const [captions, setCaptions] = useState("");
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(
    () => () => recognitionRef.current?.stop(),
    [],
  );

  const toggle = () => {
    if (active) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setActive(false);
      return;
    }
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Live captions are not supported in this browser.");
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        const latest = event.results[event.results.length - 1];
        if (latest) setCaptions(latest[0]?.transcript ?? "");
      };
      recognition.onerror = () => {
        setMessage("Microphone access is needed to show live captions.");
        setActive(false);
      };
      recognition.start();
      recognitionRef.current = recognition;
      setMessage("");
      setActive(true);
    } catch {
      setMessage("Unable to start live captions.");
    }
  };

  return (
    <>
      <button type="button" onClick={toggle} aria-label={active ? "Turn off live captions" : "Turn on live captions"} title="Live captions" className={`flex size-10 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10"}`}>
        <Captions className="size-5" />
      </button>
      {(active || message) && (
        <div className="absolute inset-x-4 bottom-20 z-20 mx-auto max-w-3xl rounded-lg bg-black/75 px-4 py-3 text-center text-sm text-white">
          {message || captions || "Listening for speech…"}
        </div>
      )}
    </>
  );
}
