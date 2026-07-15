// NAXORA VANI soft calm female-style browser voice starter.
// Voice output uses Web Speech Synthesis. Mic input uses browser SpeechRecognition.
// Real studio-quality natural voice will require a secure external TTS API later.

window.NaxoraVaniVoice = (() => {
  let muted = false;
  let recognition = null;
  let cachedVoices = [];

  function supported() {
    return typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window;
  }

  function listenSupported() {
    return typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }

  function loadVoices() {
    if (!supported()) return [];
    cachedVoices = window.speechSynthesis.getVoices() || [];
    return cachedVoices;
  }

  function pickSoftCalmVoice() {
    const voices = loadVoices();

    const preferredNames = [
      "Microsoft Swara",
      "Microsoft Heera",
      "Microsoft Neerja",
      "Google हिन्दी",
      "Google Hindi",
      "Google हिन्दी Female",
      "Google UK English Female",
      "Google US English",
      "Samantha",
      "Zira",
      "Tessa",
      "Veena"
    ];

    for (const name of preferredNames) {
      const match = voices.find((voice) =>
        String(voice.name || "").toLowerCase().includes(name.toLowerCase())
      );
      if (match) return match;
    }

    const hindiVoice = voices.find((voice) =>
      String(voice.lang || "").toLowerCase().startsWith("hi")
    );
    if (hindiVoice) return hindiVoice;

    const indianEnglishVoice = voices.find((voice) =>
      String(voice.lang || "").toLowerCase().includes("en-in")
    );
    if (indianEnglishVoice) return indianEnglishVoice;

    const englishVoice = voices.find((voice) =>
      String(voice.lang || "").toLowerCase().startsWith("en")
    );
    return englishVoice || voices[0] || null;
  }

  function speak(text, options = {}) {
    const message = String(text || "").trim();
    if (!message || muted) {
      return { spoken: false, reason: muted ? "muted" : "empty_message" };
    }

    if (!supported()) {
      return { spoken: false, reason: "browser_speech_not_supported" };
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(message);
      const voice = pickSoftCalmVoice();

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || "hi-IN";
      } else {
        utterance.lang = options.lang || "hi-IN";
      }

      // Soft, calm, friendly VANI voice settings.
      utterance.rate = Number(options.rate || 0.82);
      utterance.pitch = Number(options.pitch || 1.08);
      utterance.volume = Number(options.volume || 0.88);

      window.speechSynthesis.speak(utterance);

      return {
        spoken: true,
        voiceName: voice ? voice.name : "browser-default",
        lang: utterance.lang,
        style: "soft_calm_female_style"
      };
    } catch (err) {
      return { spoken: false, reason: err.message };
    }
  }

  function listen(options = {}) {
    return new Promise((resolve, reject) => {
      if (!listenSupported()) {
        reject(new Error("speech_recognition_not_supported"));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = options.lang || "hi-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        resolve({
          transcript,
          confidence: event.results?.[0]?.[0]?.confidence || null
        });
      };

      recognition.onerror = (event) => {
        reject(new Error(event.error || "speech_recognition_error"));
      };

      recognition.start();
    });
  }

  function stop() {
    if (supported()) window.speechSynthesis.cancel();
    try {
      if (recognition) recognition.stop();
    } catch {}
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) stop();
    return muted;
  }

  function isMuted() {
    return muted;
  }

  if (supported()) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  return {
    supported,
    listenSupported,
    speak,
    listen,
    stop,
    setMuted,
    isMuted,
    loadVoices,
    pickSoftCalmVoice
  };
})();
