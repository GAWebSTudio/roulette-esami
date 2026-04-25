import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Download,
  Home,
  ListChecks,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type Screen = "menu" | "game" | "load" | "settings";
type SetupStep = "count" | "topics";
type SavedSubject = {
  id: string;
  name: string;
  topics: string[];
  createdAt: string;
};
type AppSettings = {
  removeAfter: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
  selectedVoice: string;
  suspenseMs: number;
  maxHistory: number;
};

const MAX_TOPICS = 50;
const MAX_TOPIC_LENGTH = 25;
const DEFAULT_TOPIC_COUNT = 6;
const SUBJECTS_KEY = "stocatz_subjects_v1";
const SETTINGS_KEY = "stocatz_settings_v1";
const DEFAULT_SETTINGS: AppSettings = {
  removeAfter: true,
  soundEnabled: true,
  voiceEnabled: true,
  voiceRate: 0.78,
  voicePitch: 0.68,
  selectedVoice: "",
  suspenseMs: 5000,
  maxHistory: 12,
};

function createTopics(count: number, previous: string[] = []): string[] {
  return Array.from({ length: count }, (_, index) => previous[index] ?? "");
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => undefined);
    });
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadSavedSubjects(): SavedSubject[] {
  try {
    const raw = localStorage.getItem(SUBJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}


function getProfessorVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  const italianVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("it"));
  const preferredNames = ["paolo", "cosimo", "luca", "italiano", "italian"];

  return (
    italianVoices.find((voice) => preferredNames.some((name) => voice.name.toLowerCase().includes(name))) ??
    italianVoices[0] ??
    voices[0] ??
    null
  );
}

function playQuizIntro() {
  try {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, audioContext.currentTime);
    master.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42);
    master.connect(audioContext.destination);

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.12;
      const end = start + 0.105;

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(end + 0.03);
    });

    window.setTimeout(() => void audioContext.close().catch(() => undefined), 800);
  } catch {
    // Audio non disponibile: l'app continua senza suono quiz.
  }
}


function playCountdownTone(step: number) {
  try {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies = [620, 740, 880];
    const frequency = frequencies[Math.max(0, Math.min(2, step - 1))];

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.12, audioContext.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.36);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.38);
    window.setTimeout(() => void audioContext.close().catch(() => undefined), 650);
  } catch {
    // Suono non disponibile.
  }
}

function playRevealHit() {
  try {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, audioContext.currentTime);
    master.gain.exponentialRampToValueAtTime(0.26, audioContext.currentTime + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.72);
    master.connect(audioContext.destination);

    [1046.5, 1318.5, 1568].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.08;
      const end = start + 0.18;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(end + 0.04);
    });

    window.setTimeout(() => void audioContext.close().catch(() => undefined), 1000);
  } catch {
    // Suono non disponibile.
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>("count");
  const [topicCountInput, setTopicCountInput] = useState(String(DEFAULT_TOPIC_COUNT));
  const [draftTopics, setDraftTopics] = useState<string[]>(createTopics(DEFAULT_TOPIC_COUNT));
  const [draftSubjectName, setDraftSubjectName] = useState("");

  const [subjectName, setSubjectName] = useState("Materia libera");
  const [topics, setTopics] = useState<string[]>(["Argomento"]);
  const [availableTopics, setAvailableTopics] = useState<string[]>(["Argomento"]);
  const [reelTopics, setReelTopics] = useState<string[]>(["Argomento"]);
  const [savedSubjects, setSavedSubjects] = useState<SavedSubject[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceCue, setVoiceCue] = useState<string | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [flash, setFlash] = useState(false);
  const [winnerDisplayIndex, setWinnerDisplayIndex] = useState<number | null>(null);
  const [showPulse, setShowPulse] = useState(false);
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isSuspense, setIsSuspense] = useState(false);
  const [energyBurst, setEnergyBurst] = useState(false);
  const [focusDarken, setFocusDarken] = useState(false);

  const idleTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  const ITEM_HEIGHT_FALLBACK = 192;
  const EXTRA_LOOPS = 4;
  const OVERSHOOT = 10;
  const PRE_OVERSHOOT = 14;
  const OVERSHOOT_DURATION = 120;
  const SETTLE_DURATION = 140;
  const SPIN_DURATION = settings.suspenseMs - OVERSHOOT_DURATION - SETTLE_DURATION;
  const SUSPENSE_DURATION = 550;

  const parsedTopicCount = Number(topicCountInput);
  const cleanDraftTopics = useMemo(() => draftTopics.map((topic) => topic.trim()).filter(Boolean), [draftTopics]);
  const duplicateDraftTopics = useMemo(() => {
    const normalized = cleanDraftTopics.map((topic) => topic.toLowerCase());
    return normalized.some((topic, index) => normalized.indexOf(topic) !== index);
  }, [cleanDraftTopics]);

  const setupCountError = useMemo(() => {
    if (!topicCountInput.trim()) return "Inserisci il numero di argomenti.";
    if (!Number.isInteger(parsedTopicCount)) return "Il numero deve essere intero.";
    if (parsedTopicCount < 1) return "Inserisci almeno 1 argomento.";
    if (parsedTopicCount > MAX_TOPICS) return `Puoi inserire massimo ${MAX_TOPICS} argomenti.`;
    return "";
  }, [topicCountInput, parsedTopicCount]);

  const setupTopicsError = useMemo(() => {
    if (!draftSubjectName.trim()) return "Dai un nome alla materia.";
    if (draftSubjectName.trim().length > MAX_TOPIC_LENGTH) return `Il nome materia può avere massimo ${MAX_TOPIC_LENGTH} caratteri.`;
    if (draftTopics.some((topic) => topic.length > MAX_TOPIC_LENGTH)) return `Ogni argomento può avere massimo ${MAX_TOPIC_LENGTH} caratteri.`;
    if (cleanDraftTopics.length < parsedTopicCount) return "Compila tutti gli argomenti.";
    if (duplicateDraftTopics) return "Gli argomenti devono essere diversi tra loro.";
    return "";
  }, [draftSubjectName, draftTopics, cleanDraftTopics.length, parsedTopicCount, duplicateDraftTopics]);

  const gameError = useMemo(() => {
    if (!topics.length) return "Scegli o crea una materia prima di giocare.";
    if (!availableTopics.length) return "Argomenti terminati. Premi RESET per ricominciare.";
    return "";
  }, [topics.length, availableTopics.length]);

  useEffect(() => {
    registerServiceWorker();
    audioRef.current = new Audio("/slot.mp3");
    setSavedSubjects(loadSavedSubjects());
    setSettings(loadSettings());

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(savedSubjects));
  }, [savedSubjects]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (Number.isInteger(parsedTopicCount) && parsedTopicCount >= 1 && parsedTopicCount <= MAX_TOPICS) {
      setDraftTopics((prev) => createTopics(parsedTopicCount, prev));
    }
  }, [parsedTopicCount]);

  useEffect(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    setShowPulse(false);
    if (!isSpinning && !gameError && screen === "game") {
      idleTimerRef.current = window.setTimeout(() => setShowPulse(true), 2000);
    }
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [isSpinning, gameError, screen]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
  };


  const speakResult = (topic: string) => {
    if (!settings.voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const chosenVoice = voices.find((voice) => voice.name === settings.selectedVoice);
    const professorVoice = chosenVoice ?? getProfessorVoice();
    const utterance = new SpeechSynthesisUtterance(`Argomento estratto. ${topic}.`);

    utterance.lang = professorVoice?.lang ?? "it-IT";
    if (professorVoice) utterance.voice = professorVoice;
    utterance.rate = settings.voiceRate;
    utterance.pitch = settings.voicePitch;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };

  const startQuizVoiceSequence = (winner: string) => {
    if (!settings.voiceEnabled) return;

    const sequence = [
      { delay: 0, cue: "3", tone: 1 },
      { delay: 680, cue: "2", tone: 2 },
      { delay: 1360, cue: "1", tone: 3 },
      { delay: 2040, cue: "STOCATZ", reveal: true },
      { delay: 2800, cue: "Pausa..." },
      { delay: 3400, cue: null, speak: true },
    ];

    sequence.forEach((item) => {
      const timer = window.setTimeout(() => {
        setVoiceCue(item.cue);
        if (settings.soundEnabled && "tone" in item && item.tone) playCountdownTone(item.tone);
        if (settings.soundEnabled && "reveal" in item && item.reveal) {
          playRevealHit();
          playQuizIntro();
        }
        if ("speak" in item && item.speak) {
          speakResult(winner);
          const clearCueTimer = window.setTimeout(() => setVoiceCue(null), 900);
          timersRef.current.push(clearCueTimer);
        }
      }, item.delay);

      timersRef.current.push(timer);
    });
  };

  const applyTopics = (name: string, nextTopics: string[]) => {
    const clean = nextTopics.map((topic) => topic.trim()).filter(Boolean);
    clearTimers();
    setSubjectName(name.trim() || "Materia libera");
    setTopics(clean);
    setAvailableTopics(clean);
    setReelTopics(clean.length ? clean : ["Argomento"]);
    setIsSpinning(false);
    setFlash(false);
    setWinnerDisplayIndex(null);
    setLastWinner(null);
    setHistory([]);
    setIsSuspense(false);
    setEnergyBurst(false);
    setFocusDarken(false);
    setVoiceCue(null);
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (reelRef.current) {
      reelRef.current.style.transition = "none";
      reelRef.current.style.transform = "translate3d(0,0,0)";
    }
  };

  const openNewSubjectSetup = () => {
    setSetupOpen(true);
    setSetupStep("count");
    setTopicCountInput(String(DEFAULT_TOPIC_COUNT));
    setDraftTopics(createTopics(DEFAULT_TOPIC_COUNT));
    setDraftSubjectName("");
  };

  const handleMenuPlay = () => {
    if (savedSubjects.length === 0) {
      setScreen("game");
      openNewSubjectSetup();
      return;
    }

    setScreen("load");
  };

  const saveSubject = () => {
    if (setupTopicsError) return;
    const clean = cleanDraftTopics.slice(0, parsedTopicCount);
    const name = draftSubjectName.trim();
    const existingIndex = savedSubjects.findIndex((subject) => subject.name.toLowerCase() === name.toLowerCase());
    const nextSubject: SavedSubject = {
      id: existingIndex >= 0 ? savedSubjects[existingIndex].id : makeId(),
      name,
      topics: clean,
      createdAt: new Date().toISOString(),
    };

    setSavedSubjects((prev) => {
      if (existingIndex >= 0) return prev.map((subject, index) => (index === existingIndex ? nextSubject : subject));
      return [nextSubject, ...prev];
    });
    applyTopics(name, clean);
    setSetupOpen(false);
    setScreen("game");
  };

  const deleteSubject = (id: string) => {
    setSavedSubjects((prev) => prev.filter((subject) => subject.id !== id));
  };

  const updateDraftTopic = (index: number, value: string) => {
    const safeValue = value.slice(0, MAX_TOPIC_LENGTH);
    setDraftTopics((prev) => prev.map((topic, i) => (i === index ? safeValue : topic)));
  };

  const getItemHeight = () => {
    const firstItem = reelRef.current?.children[0] as HTMLElement | undefined;
    return firstItem?.clientHeight || ITEM_HEIGHT_FALLBACK;
  };

  const getGlow = () => {
    if (!lastWinner) return "rgba(34,211,197,0.55)";
    return lastWinner.length <= 8 ? "rgba(242,193,78,0.85)" : "rgba(34,211,197,0.85)";
  };

  const spin = () => {
    if (!availableTopics.length || isSpinning || gameError) return;

    clearTimers();
    setShowPulse(false);
    setIsSuspense(false);
    setEnergyBurst(false);
    setFocusDarken(false);
    setVoiceCue(null);
    setLastWinner(null);

    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => undefined);
    }

    const base = [...availableTopics];
    const repeated = Array.from({ length: EXTRA_LOOPS }, () => base).flat();

    setReelTopics(repeated);
    setIsSpinning(true);
    setFlash(false);

    const winner = randomFromArray(base);
    const index = base.indexOf(winner);
    const finalIndex = base.length * (EXTRA_LOOPS - 1) + index;
    setWinnerDisplayIndex(finalIndex);

    const itemHeight = getItemHeight();
    const finalY = finalIndex * itemHeight;
    const reel = reelRef.current;

    if (reel) {
      reel.style.transition = "none";
      reel.style.transform = "translate3d(0,0,0)";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reel.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.12,0.74,0.18,1)`;
          reel.style.transform = `translate3d(0,-${finalY}px,0)`;
        });
      });

      const suspenseTimer = window.setTimeout(() => setIsSuspense(true), Math.max(0, SPIN_DURATION - SUSPENSE_DURATION));
      const overshootTimer = window.setTimeout(() => {
        setIsSuspense(false);
        reel.style.transition = "transform 90ms ease-out";
        reel.style.transform = `translate3d(0,-${finalY - PRE_OVERSHOOT}px,0)`;

        const forwardTimer = window.setTimeout(() => {
          reel.style.transition = `transform ${OVERSHOOT_DURATION}ms ease-out`;
          reel.style.transform = `translate3d(0,-${finalY + OVERSHOOT}px,0)`;

          const settleTimer = window.setTimeout(() => {
            reel.style.transition = `transform ${SETTLE_DURATION}ms ease-out`;
            reel.style.transform = `translate3d(0,-${finalY}px,0)`;
          }, OVERSHOOT_DURATION);

          timersRef.current.push(settleTimer);
        }, 90);

        timersRef.current.push(forwardTimer);
      }, SPIN_DURATION);

      timersRef.current.push(suspenseTimer, overshootTimer);
    }

    const finishTimer = window.setTimeout(() => {
      if (reel) {
        reel.style.transition = "none";
        reel.style.transform = `translate3d(0,-${finalY}px,0)`;
      }

      audioRef.current?.pause();
      setIsSpinning(false);
      setLastWinner(winner);
      setFlash(true);
      setEnergyBurst(true);
      setFocusDarken(true);
      setHistory((prev) => [winner, ...prev].slice(0, settings.maxHistory));

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([80, 40, 120]);
      }

      startQuizVoiceSequence(winner);

      const flashTimer = window.setTimeout(() => setFlash(false), 400);
      const burstTimer = window.setTimeout(() => setEnergyBurst(false), 650);
      const darkenTimer = window.setTimeout(() => setFocusDarken(false), 520);
      timersRef.current.push(flashTimer, burstTimer, darkenTimer);

      if (settings.removeAfter) {
        setAvailableTopics((prev) => prev.filter((topic) => topic !== winner));
      }
    }, settings.suspenseMs);

    timersRef.current.push(finishTimer);
  };

  const reset = () => {
    applyTopics(subjectName, topics);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ savedSubjects, settings }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stocatz-materie.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderBrand = () => (
    <div className="brand-block">
      <div className="logo-mark" aria-hidden="true"><img src="/brand-icon.png" alt="" /></div>
      <motion.h1
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        className="title"
      >
        Stocatz
      </motion.h1>
      <p className="subtitle">Selettore stocastico per interrogazioni ed esami</p>
    </div>
  );

  return (
    <motion.div animate={flash ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} className="page-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <main className="app-frame">
        <section className={`card ${screen === "menu" ? "menu-card" : ""}`} aria-label="Stocatz">
          {screen === "menu" && (
            <div className="menu-content">
              {renderBrand()}
              <div className="menu-actions">
                <button className="menu-button primary-menu-button" onClick={handleMenuPlay} type="button">
                  <Play size={24} /> <span>Gioca</span> <ChevronRight size={22} />
                </button>
                <button className="menu-button" onClick={() => setScreen("load")} type="button">
                  <BookOpen size={24} /> <span>Carica</span> <ChevronRight size={22} />
                </button>
                <button className="menu-button" onClick={() => setScreen("settings")} type="button">
                  <Settings size={24} /> <span>Impostazioni</span> <ChevronRight size={22} />
                </button>
              </div>
              <p className="menu-note">Crea una materia, salva gli argomenti e fai girare la roulette.</p>
            </div>
          )}

          {screen === "game" && (
            <>
              <div className="card-header compact-header">
                <button className="ghost-button" onClick={() => setScreen("menu")} type="button"><Home size={18} /> Menu</button>
                <button className="icon-button" onClick={() => setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))} type="button" aria-label={settings.soundEnabled ? "Disattiva audio" : "Attiva audio"}>
                  {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
              </div>

              <div className="game-heading game-heading-centered">
                <div className="subject-heading-block">
                  <span className="setup-kicker"><Sparkles size={15} /> Materia attiva</span>
                  <h2>{subjectName}</h2>
                  <p>{topics.length} argomenti caricati</p>
                </div>
              </div>

              <div className="card-content">
                <div className="reel-viewport">
                  <motion.div animate={focusDarken ? { opacity: [0, 0.42, 0.24] } : { opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="focus-overlay" />
                  <motion.div animate={energyBurst ? { opacity: [0, 0.9, 0], scale: [0.7, 1.2, 1.55] } : { opacity: 0, scale: 0.8 }} transition={{ duration: 0.65, ease: "easeOut" }} className="energy-burst" />
                  {voiceCue && (
                    <motion.div
                      key={voiceCue}
                      initial={{ opacity: 0, scale: 0.6, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={`voice-cue ${voiceCue === "Pausa..." ? "voice-cue-small" : ""}`}
                    >
                      {voiceCue}
                    </motion.div>
                  )}
                  <motion.div animate={isSpinning ? { opacity: [0.28, 0.6, 0.28] } : energyBurst ? { opacity: [0.5, 1, 0.4] } : { opacity: 0.35 }} transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.9, ease: "easeInOut" }} className="highlight-band" />
                  <motion.div animate={isSuspense ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.25 }} transition={{ repeat: isSuspense ? Infinity : 0, duration: 0.16, ease: "linear" }} className="center-line" />
                  <div className="top-fade" />
                  <div className="bottom-fade" />
                  <div ref={reelRef} className="reel-track">
                    {reelTopics.map((topic, i) => (
                      <div key={`${topic}-${i}`} className="reel-item">
                        <motion.span
                          animate={flash && i === winnerDisplayIndex ? { scale: [1, 1.28, 1.12], filter: ["blur(0px)", "blur(2px)", "blur(0px)"] } : isSuspense && i === winnerDisplayIndex ? { opacity: [0.55, 1, 0.55], scale: [1, 1.05, 1] } : { scale: 1, opacity: 1 }}
                          transition={{ duration: isSuspense && i === winnerDisplayIndex ? 0.16 : 0.35, repeat: isSuspense && i === winnerDisplayIndex ? Infinity : 0 }}
                          className="reel-number reel-topic"
                        >
                          {topic}
                        </motion.span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="result-card" aria-live="polite">
                  <span className="result-label">Argomento estratto</span>
                  <strong className={isSpinning ? "result-status" : undefined}>{isSpinning ? "Estrazione in corso…" : lastWinner ?? "—"}</strong>
                  <small>{availableTopics.length} disponibili</small>
                </div>

                {gameError && <p className="error-message">{gameError}</p>}

                <div className="button-grid">
                  <motion.div
                    className="grow-wrap"
                    animate={showPulse ? { scale: [1, 1.05, 1], boxShadow: [`0 0 0px ${getGlow()}`, `0 0 30px ${getGlow()}`, `0 0 0px ${getGlow()}`] } : { scale: 1 }}
                    whileHover={{ scale: gameError ? 1 : 1.04, boxShadow: gameError ? "none" : `0 0 26px ${getGlow()}`, filter: gameError ? "none" : "brightness(1.08)" }}
                    whileTap={{ scale: gameError ? 1 : 0.98 }}
                    transition={showPulse ? { repeat: Infinity, duration: 1.2 } : { duration: 0.15 }}
                  >
                    <button onClick={spin} disabled={!!gameError || isSpinning} className="action-button primary-button" type="button"><Play size={20} /> GIRA</button>
                  </motion.div>
                  <button onClick={reset} className="action-button reset-button" type="button"><RotateCcw size={20} /> RESET</button>
                </div>

                {history.length > 0 && (
                  <div className="history-card">
                    <span className="history-title">Cronologia</span>
                    <div className="history-list history-topic-list">{history.map((topic, index) => <span key={`${topic}-${index}`}>{topic}</span>)}</div>
                  </div>
                )}
              </div>
            </>
          )}

          {screen === "load" && (
            <div className="panel-content">
              <div className="panel-header subject-select-header"><button className="ghost-button" onClick={() => setScreen("menu")} type="button"><Home size={18} /> Menu</button><h2>Scegli materia</h2><button className="header-add-subject" onClick={openNewSubjectSetup} type="button" aria-label="Crea nuova materia"><Plus size={18} /> Nuova materia</button></div>
              {savedSubjects.length === 0 ? (
                <div className="empty-state"><BookOpen size={42} /><h3>Nessuna materia salvata</h3><p>Crea la prima materia per iniziare a usare la roulette Stocatz.</p><button className="secondary-button" onClick={() => { setScreen("game"); openNewSubjectSetup(); }} type="button"><Plus size={18} /> Crea prima materia</button></div>
              ) : (
                <div className="subjects-list">
                  {savedSubjects.map((subject) => (
                    <article className="subject-card" key={subject.id}>
                      <button onClick={() => { applyTopics(subject.name, subject.topics); setScreen("game"); }} type="button" className="subject-play">
                        <span>{subject.name}</span><small>{subject.topics.length} argomenti</small>
                      </button>
                      <button className="delete-button" onClick={() => deleteSubject(subject.id)} type="button" aria-label={`Elimina ${subject.name}`}><Trash2 size={18} /></button>
                    </article>
                  ))}
                  <button className="add-subject-card" onClick={openNewSubjectSetup} type="button">
                    <span className="add-subject-icon"><Plus size={22} /></span>
                    <span>Nuova materia</span>
                    <small>Aggiungi un nuovo set di argomenti</small>
                  </button>
                </div>
              )}
            </div>
          )}

          {screen === "settings" && (
            <div className="panel-content">
              <div className="panel-header"><button className="ghost-button" onClick={() => setScreen("menu")} type="button"><Home size={18} /> Menu</button><h2>Impostazioni</h2></div>
              <div className="settings-grid">
                <SettingSwitch title="Escludi argomenti già usciti" subtitle="Evita ripetizioni fino al reset." value={settings.removeAfter} onChange={() => setSettings((prev) => ({ ...prev, removeAfter: !prev.removeAfter }))} />
                <SettingSwitch title="Audio slot" subtitle="Attiva o disattiva il suono durante l’estrazione." value={settings.soundEnabled} onChange={() => setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))} />
                <SettingSwitch title="Voce professore" subtitle="Pronuncia ad alta voce l’argomento estratto dopo countdown, suspense e pausa." value={settings.voiceEnabled} onChange={() => setSettings((prev) => ({ ...prev, voiceEnabled: !prev.voiceEnabled }))} />
                <div className="setting-card"><div><span className="switch-title">Voce disponibile</span><span className="switch-subtitle">Scegli manualmente la voce del dispositivo/browser.</span></div><select className="select-input voice-select" value={settings.selectedVoice} onChange={(e) => setSettings((prev) => ({ ...prev, selectedVoice: e.target.value }))}><option value="">Automatica professore</option>{voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}</select></div>
                <div className="setting-card"><div><span className="switch-title">Stile voce</span><span className="switch-subtitle">Lettura lenta, più grave e autorevole.</span></div><select className="select-input" value={`${settings.voiceRate}-${settings.voicePitch}`} onChange={(e) => { const [voiceRate, voicePitch] = e.target.value.split("-").map(Number); setSettings((prev) => ({ ...prev, voiceRate, voicePitch })); }}><option value="0.72-0.58">Professore solenne</option><option value="0.78-0.68">Quiz TV lento</option><option value="0.86-0.74">Professore standard</option><option value="1-0.9">Chiara naturale</option></select></div>
                <div className="setting-card"><div><span className="switch-title">Durata animazione</span><span className="switch-subtitle">Regola la suspense della roulette.</span></div><select className="select-input" value={settings.suspenseMs} onChange={(e) => setSettings((prev) => ({ ...prev, suspenseMs: Number(e.target.value) }))}><option value={3500}>Veloce</option><option value={5000}>Normale</option><option value={6500}>Lenta</option></select></div>
                <div className="setting-card"><div><span className="switch-title">Cronologia</span><span className="switch-subtitle">Numero massimo di estrazioni visibili.</span></div><select className="select-input" value={settings.maxHistory} onChange={(e) => setSettings((prev) => ({ ...prev, maxHistory: Number(e.target.value) }))}><option value={6}>6</option><option value={12}>12</option><option value={20}>20</option></select></div>
                <button className="setting-card action-setting" onClick={exportData} type="button"><Download size={20} /><div><span className="switch-title">Esporta materie</span><span className="switch-subtitle">Scarica un backup JSON delle materie salvate.</span></div></button>
                <button className="setting-card action-setting danger-setting" onClick={() => { setSavedSubjects([]); localStorage.removeItem(SUBJECTS_KEY); }} type="button"><Trash2 size={20} /><div><span className="switch-title">Cancella materie salvate</span><span className="switch-subtitle">Rimuove tutte le materie dal dispositivo.</span></div></button>
              </div>
            </div>
          )}
        </section>
      </main>

      {setupOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Scegli argomenti">
          <div className="setup-modal">
            <div className="modal-header"><div><span className="setup-kicker"><ListChecks size={15} /> Scegli argomenti</span><h2>{setupStep === "count" ? "Quanti argomenti?" : "Compila la materia"}</h2></div><button className="icon-button" onClick={() => setSetupOpen(false)} type="button" aria-label="Chiudi"><X size={20} /></button></div>

            {setupStep === "count" ? (
              <div className="modal-body compact-modal-body">
                <label className="field"><span className="field-label">Numero argomenti</span><input value={topicCountInput} onChange={(e) => setTopicCountInput(e.target.value)} inputMode="numeric" className="text-input large-number-input" placeholder="Es. 12" /></label>
                <p className="helper-text">Puoi creare una materia con massimo {MAX_TOPICS} argomenti. Ogni argomento avrà massimo {MAX_TOPIC_LENGTH} caratteri.</p>
                {setupCountError && <p className="error-message">{setupCountError}</p>}
                <button disabled={!!setupCountError} className="action-button primary-button" onClick={() => setSetupStep("topics")} type="button">Avanti <ChevronRight size={20} /></button>
              </div>
            ) : (
              <div className="modal-body">
                <label className="field"><span className="field-label">Nome materia</span><input value={draftSubjectName} onChange={(e) => setDraftSubjectName(e.target.value.slice(0, MAX_TOPIC_LENGTH))} maxLength={MAX_TOPIC_LENGTH} className="text-input" placeholder="Es. Psicologia" /></label>
                <div className="topics-grid modal-topics-grid">
                  {draftTopics.map((topic, index) => (
                    <div className="field" key={index}>
                      <label className="field-label" htmlFor={`draft-topic-${index}`}>Argomento {index + 1}</label>
                      <input id={`draft-topic-${index}`} value={topic} onChange={(e) => updateDraftTopic(index, e.target.value)} maxLength={MAX_TOPIC_LENGTH} className="text-input topic-input" placeholder="Es. Freud" />
                      <small className="char-count">{topic.length}/{MAX_TOPIC_LENGTH}</small>
                    </div>
                  ))}
                </div>
                {setupTopicsError && <p className="error-message">{setupTopicsError}</p>}
                <div className="modal-actions"><button className="action-button reset-button" onClick={() => setSetupStep("count")} type="button">Indietro</button><button disabled={!!setupTopicsError} className="action-button primary-button" onClick={saveSubject} type="button"><Save size={20} /> Salva materia</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SettingSwitch({ title, subtitle, value, onChange }: { title: string; subtitle: string; value: boolean; onChange: () => void }) {
  return (
    <div className="setting-card">
      <div><span className="switch-title">{title}</span><span className="switch-subtitle">{subtitle}</span></div>
      <button type="button" className={`switch ${value ? "switch-on" : "switch-off"}`} onClick={onChange} aria-pressed={value}><span className="switch-thumb" /></button>
    </div>
  );
}
