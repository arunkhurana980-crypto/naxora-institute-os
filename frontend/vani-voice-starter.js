// NAXORA VANI browser voice + listen foundation.
// Speech output: Web Speech Synthesis.
// Mic input: SpeechRecognition/webkitSpeechRecognition when supported.
// Browsers require user click and mic permission.

window.NaxoraVaniVoice = (() => {
  let muted = false;
  let recognition = null;

  function supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  function listenSupported() {
    return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }

  function speak(text, options = {}) {
    const message = String(text || "").trim();
    if (!message || muted) return { spoken: false, reason: muted ? "muted" : "empty_message" };
    if (!supported()) return { spoken: false, reason: "browser_speech_not_supported" };
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = options.lang || "hi-IN";
      utterance.rate = options.rate || 0.95;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      window.speechSynthesis.speak(utterance);
      return { spoken: true };
    } catch (err) {
      return { spoken: false, reason: err.message };
    }
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

  return { supported, listenSupported, speak, listen, stop, setMuted, isMuted };
})();
