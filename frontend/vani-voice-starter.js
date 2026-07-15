// NAXORA VANI soft calm female-style browser voice starter.
// Browser voices depend on user's device/browser. Real studio-quality voice will need external TTS later.

window.NaxoraVaniVoice = (() => {
  let muted = false;
  let recognition = null;
  let cachedVoices = [];

  function supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  function loadVoices() {
    if (!supported()) return [];
    cachedVoices = window.speechSynthesis.getVoices() || [];
    return cachedVoices;
  }

  function pickSoftFemaleVoice() {
    const voices = loadVoices();
    const preferredNames = [
      "Microsoft Swara", "Microsoft Heera", "Microsoft Neerja",
      "Google हिन्दी", "Google Hindi", "Google हिन्दी Female",
      "Samantha", "Zira", "Google UK English Female", "Google US English"
    ];
    for (const name of preferredNames) {
      const match = voices.find((v) => String(v.name || "").toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }
    return voices.find((v) => String(v.lang || "").toLowerCase().includes("hi"))
      || voices.find((v) => String(v.lang || "").toLowerCase().includes("en-in"))
      || voices[0]
      || null;
  }

  function speak(text, options = {}) {
    const message = String(text || "").trim();
    if (!message || muted) return { spoken: false, reason: muted ? "muted" : "empty_message" };
    if (!supported()) return { spoken: false, reason: "browser_speech_not_supported" };
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      const voice = pickSoftFemaleVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || "hi-IN";
      } else {
        utterance.lang = "hi-IN";
      }
      utterance.rate = options.rate || 0.82;
      utterance.pitch = options.pitch || 1.08;
      utterance.volume = options.volume || 0.88;
      window.speechSynthesis.speak(utterance);
      return { spoken: true, voiceName: voice ? voice.name : "default", lang: utterance.lang };
    } catch (err) {
      return { spoken: false, reason: err.message };
    }
  }

  function listenSupported() {
    return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }

  function listen(options = {}) {
    return new Promise((resolve, reject) => {
      if (!listenSupported()) return reject(new Error("speech_recognition_not_supported"));
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = options.lang || "hi-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        resolve({ transcript, confidence: event.results?.[0]?.[0]?.confidence || null });
      };
      recognition.onerror = (event) => reject(new Error(event.error || "speech_recognition_error"));
      recognition.start();
    });
  }

  function stop() {
    if (supported()) window.speechSynthesis.cancel();
    try { if (recognition) recognition.stop(); } catch {}
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) stop();
    return muted;
  }

  function isMuted() { return muted; }

  if (supported()) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  return { supported, listenSupported, speak, listen, stop, setMuted, isMuted, loadVoices };
})();
