// NAXORA VANI browser voice starter.
// Works after user taps a button because browsers block automatic speech.
// This is Level 1 voice. Advanced mic conversation comes in Parts 84–88.
window.NaxoraVaniVoice = (() => {
  let muted = false;

  function supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
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

  function stop() {
    if (supported()) window.speechSynthesis.cancel();
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) stop();
    return muted;
  }

  function isMuted() {
    return muted;
  }

  return { supported, speak, stop, setMuted, isMuted };
})();
