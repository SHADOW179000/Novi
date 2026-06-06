// Shared Text-to-Speech utility: src/utils/speech.js
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// Helper to check if running in Capacitor mobile environment
const isCapacitor = () => {
  return window.Capacitor !== undefined || window.location.protocol === 'file:';
};

export const speakResponse = async (text, language, emotion) => {
  const langVoiceMap = {
    'en-IN': { lang: 'en-IN', fallbacks: ['en-IN', 'en-GB', 'en-US'], rate: 1.0 },
    'hi-IN': { lang: 'hi-IN', fallbacks: ['hi-IN', 'hi'], rate: 0.9 },
    'ta-IN': { lang: 'ta-IN', fallbacks: ['ta-IN', 'ta'], rate: 0.85 },
    'te-IN': { lang: 'te-IN', fallbacks: ['te-IN', 'te'], rate: 0.85 },
    'kn-IN': { lang: 'kn-IN', fallbacks: ['kn-IN', 'kn'], rate: 0.85 },
    'bn-IN': { lang: 'bn-IN', fallbacks: ['bn-IN', 'bn'], rate: 0.9 },
    'mr-IN': { lang: 'mr-IN', fallbacks: ['mr-IN', 'mr'], rate: 0.9 }
  };
  
  const emotionRates = {
    'PANIC': 0.8,
    'FEAR': 0.8,
    'DANGER': 1.1,
    'URGENT': 1.1,
    'CALM': 1.0,
    'NEUTRAL': 1.0
  };
  
  const config = langVoiceMap[language] || langVoiceMap['en-IN'];
  const emotionRate = emotionRates[emotion] || 1.0;
  const finalRate = config.rate * emotionRate;
  const finalPitch = emotion === 'PANIC' ? 1.2 : 1.0;

  // Try Native Mobile TTS first if running in Capacitor
  if (isCapacitor()) {
    try {
      await TextToSpeech.stop();
      await TextToSpeech.speak({
        text: text,
        lang: config.lang,
        rate: finalRate,
        pitch: finalPitch,
        volume: 1.0,
        category: 'ambient',
        queueStrategy: 1 // Flush and interrupt any ongoing speech
      });
      return;
    } catch (err) {
      console.warn("Capacitor Native TTS failed or not ready, falling back to Web Speech API", err);
    }
  }

  // Fallback: Web Speech API (speechSynthesis)
  if (!window.speechSynthesis) return;
  
  // Cancel any current speaking
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  const executeSpeak = (voices) => {
    let selectedVoice = null;
    const targetLangLower = config.lang.toLowerCase();
    const primaryLang = targetLangLower.split('-')[0];
    
    // Step 1: Search for exact match or suffix matching (e.g. ta-IN or ta_IN)
    selectedVoice = voices.find(v => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang === targetLangLower;
    });
    
    // Step 2: Fallback to voices matching any fallback language code exactly
    if (!selectedVoice) {
      for (const fallback of config.fallbacks) {
        const fallbackLower = fallback.toLowerCase().replace('_', '-');
        selectedVoice = voices.find(v => {
          const vLang = v.lang.toLowerCase().replace('_', '-');
          return vLang === fallbackLower;
        });
        if (selectedVoice) break;
      }
    }
    
    // Step 3: Search by primary language prefix (e.g. starts with "ta")
    if (!selectedVoice) {
      selectedVoice = voices.find(v => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        return vLang.startsWith(primaryLang + '-') || vLang === primaryLang;
      });
    }
    
    // Step 4: Search the voice name for the language name (e.g. "tamil" in name)
    if (!selectedVoice) {
      const langNames = {
        'hi': 'hindi',
        'ta': 'tamil',
        'te': 'telugu',
        'kn': 'kannada',
        'bn': 'bengali',
        'mr': 'marathi',
        'en': 'english'
      };
      const searchName = langNames[primaryLang];
      if (searchName) {
        selectedVoice = voices.find(v => {
          const name = v.name.toLowerCase();
          return name.includes(searchName) || (primaryLang === 'bn' && name.includes('bangla'));
        });
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = config.lang;
    }
    
    utterance.rate = finalRate;
    utterance.pitch = finalPitch;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  const loadVoicesAndSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      executeSpeak(voices);
      return true;
    }
    return false;
  };

  // Immediate attempt
  if (loadVoicesAndSpeak()) return;

  // Polling fallback check for WebViews where voiceschanged doesn't trigger reliably
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (loadVoicesAndSpeak()) {
      clearInterval(interval);
    } else if (attempts >= 10) {
      clearInterval(interval);
      executeSpeak(window.speechSynthesis.getVoices() || []);
    }
  }, 100);

  // Standard event handler backup
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    loadVoicesAndSpeak();
  }, { once: true });
};
