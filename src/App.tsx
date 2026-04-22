import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

function buildRange(min: number, max: number): number[] {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) return [];
  const arr: number[] = [];
  for (let i = min; i <= max; i += 1) arr.push(i);
  return arr;
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
    });
  }
}

export default function App() {
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('25');
  const [numbers, setNumbers] = useState<number[]>(buildRange(1, 25));
  const [reelNumbers, setReelNumbers] = useState<number[]>(buildRange(1, 25));
  const [isSpinning, setIsSpinning] = useState(false);
  const [removeAfter, setRemoveAfter] = useState(false);
  const [flash, setFlash] = useState(false);
  const [winnerDisplayIndex, setWinnerDisplayIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPulse, setShowPulse] = useState(false);
  const [lastWinner, setLastWinner] = useState<number | null>(null);
  const [isSuspense, setIsSuspense] = useState(false);
  const [energyBurst, setEnergyBurst] = useState(false);
  const [focusDarken, setFocusDarken] = useState(false);

  const idleTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  const ITEM_HEIGHT_FALLBACK = 176;
  const EXTRA_LOOPS = 3;
  const AUDIO_DURATION = 5000;
  const OVERSHOOT = 10;
  const PRE_OVERSHOOT = 14;
  const OVERSHOOT_DURATION = 120;
  const SETTLE_DURATION = 140;
  const SUSPENSE_DURATION = 550;
  const SPIN_DURATION = AUDIO_DURATION - OVERSHOOT_DURATION - SETTLE_DURATION;

  const getGlow = () => {
    if (lastWinner === null) return 'rgba(255,215,0,0.6)';
    if (lastWinner < 10) return 'rgba(255,215,0,0.9)';
    if (lastWinner < 20) return 'rgba(255,140,0,0.9)';
    return 'rgba(255,70,70,0.9)';
  };

  useEffect(() => {
    const next = buildRange(Number(min), Number(max));
    setNumbers(next);
    setReelNumbers(next);
  }, [min, max]);

  useEffect(() => {
    audioRef.current = new Audio('/slot.mp3');
    registerServiceWorker();

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    setShowPulse(false);

    if (!isSpinning) {
      idleTimerRef.current = window.setTimeout(() => setShowPulse(true), 2000);
    }

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [isSpinning]);

  const getItemHeight = () => {
    const firstItem = reelRef.current?.children[0] as HTMLElement | undefined;
    return firstItem?.clientHeight || ITEM_HEIGHT_FALLBACK;
  };

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
  };

  const spin = () => {
    if (!numbers.length || isSpinning) return;

    clearTimers();
    setShowPulse(false);
    setIsSuspense(false);
    setEnergyBurst(false);
    setFocusDarken(false);

    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => undefined);
    }

    const base = [...numbers];
    const repeated = Array.from({ length: EXTRA_LOOPS }, () => base).flat();

    setReelNumbers(repeated);
    setIsSpinning(true);
    setFlash(false);

    const winner = randomFromArray(base);
    setLastWinner(winner);

    const index = base.indexOf(winner);
    const finalIndex = base.length * (EXTRA_LOOPS - 1) + index;
    setWinnerDisplayIndex(finalIndex);

    const itemHeight = getItemHeight();
    const finalY = finalIndex * itemHeight;
    const reel = reelRef.current;

    if (reel) {
      reel.style.transition = 'none';
      reel.style.transform = 'translate3d(0,0,0)';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          reel.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.12,0.74,0.18,1)`;
          reel.style.transform = `translate3d(0,-${finalY}px,0)`;
        });
      });

      const suspenseTimer = window.setTimeout(() => {
        setIsSuspense(true);
      }, Math.max(0, SPIN_DURATION - SUSPENSE_DURATION));

      const overshootTimer = window.setTimeout(() => {
        setIsSuspense(false);
        reel.style.transition = 'transform 90ms ease-out';
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
        reel.style.transition = 'none';
        reel.style.transform = `translate3d(0,-${finalY}px,0)`;
      }

      audioRef.current?.pause();
      setIsSpinning(false);
      setFlash(true);
      setEnergyBurst(true);
      setFocusDarken(true);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([80, 40, 120]);
      }

      const flashTimer = window.setTimeout(() => setFlash(false), 400);
      const burstTimer = window.setTimeout(() => setEnergyBurst(false), 650);
      const darkenTimer = window.setTimeout(() => setFocusDarken(false), 520);

      timersRef.current.push(flashTimer, burstTimer, darkenTimer);

      if (removeAfter) {
        setNumbers((prev) => prev.filter((n) => n !== winner));
      }
    }, AUDIO_DURATION);

    timersRef.current.push(finishTimer);
  };

  const reset = () => {
    clearTimers();

    const next = buildRange(Number(min), Number(max));
    setNumbers(next);
    setReelNumbers(next);
    setIsSpinning(false);
    setFlash(false);
    setWinnerDisplayIndex(null);
    setLastWinner(null);
    setIsSuspense(false);
    setEnergyBurst(false);
    setFocusDarken(false);

    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;

    if (reelRef.current) {
      reelRef.current.style.transition = 'none';
      reelRef.current.style.transform = 'translate3d(0,0,0)';
    }
  };

  return (
    <motion.div
      animate={flash ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      className="page-shell"
    >
      <div className="app-frame">
        <div className="card">
          <div className="card-header">
            <div className="header-actions">
              <button
                onClick={() => setSoundEnabled((prev) => !prev)}
                type="button"
                className="icon-button"
                aria-label={soundEnabled ? 'Disattiva audio' : 'Attiva audio'}
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>

            <div className="title-wrap">
              <motion.h1
                initial={{ backgroundPosition: '0% 50%' }}
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="title"
              >
                🎰 Roulette per gli Esami
              </motion.h1>
              <p className="subtitle">Estrazione casuale delle pagine per interrogazione</p>
            </div>
          </div>

          <div className="card-content">
            <div className="reel-viewport">
              <motion.div
                animate={focusDarken ? { opacity: [0, 0.42, 0.24] } : { opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="focus-overlay"
              />

              <motion.div
                animate={energyBurst ? { opacity: [0, 0.9, 0], scale: [0.7, 1.2, 1.55] } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="energy-burst"
              />

              <motion.div
                animate={isSpinning ? { opacity: [0.28, 0.6, 0.28] } : energyBurst ? { opacity: [0.5, 1, 0.4] } : { opacity: 0.35 }}
                transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.9, ease: 'easeInOut' }}
                className="highlight-band"
              />

              <motion.div
                animate={isSuspense ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.25 }}
                transition={{ repeat: isSuspense ? Infinity : 0, duration: 0.16, ease: 'linear' }}
                className="center-line"
              />

              <div className="top-fade" />
              <div className="bottom-fade" />

              <div ref={reelRef} className="reel-track">
                {reelNumbers.map((n, i) => (
                  <div key={`${n}-${i}`} className="reel-item">
                    <motion.span
                      animate={
                        flash && i === winnerDisplayIndex
                          ? { scale: [1, 1.5, 1.2], filter: ['blur(0px)', 'blur(2px)', 'blur(0px)'] }
                          : isSuspense && i === winnerDisplayIndex
                            ? { opacity: [0.55, 1, 0.55], scale: [1, 1.05, 1] }
                            : { scale: 1, opacity: 1 }
                      }
                      transition={{
                        duration: isSuspense && i === winnerDisplayIndex ? 0.16 : 0.35,
                        repeat: isSuspense && i === winnerDisplayIndex ? Infinity : 0,
                      }}
                      className="reel-number"
                    >
                      {n}
                    </motion.span>
                  </div>
                ))}
              </div>
            </div>

            <div className="button-grid">
              <motion.div
                className="grow-wrap"
                animate={
                  showPulse
                    ? {
                        scale: [1, 1.05, 1],
                        boxShadow: [`0 0 0px ${getGlow()}`, `0 0 30px ${getGlow()}`, `0 0 0px ${getGlow()}`],
                      }
                    : { scale: 1 }
                }
                whileHover={{ scale: 1.04, boxShadow: `0 0 26px ${getGlow()}`, filter: 'brightness(1.08)' }}
                whileTap={{ scale: 0.98 }}
                transition={showPulse ? { repeat: Infinity, duration: 1.2 } : { duration: 0.15 }}
              >
                <button onClick={spin} className="action-button primary-button" type="button">
                  <Play size={20} /> GIRA
                </button>
              </motion.div>

              <button onClick={reset} className="action-button reset-button" type="button">
                <RotateCcw size={20} /> RESET
              </button>
            </div>

            <div className="input-grid">
              <div className="field">
                <label className="field-label" htmlFor="pagina-iniziale">Pagina iniziale</label>
                <input
                  id="pagina-iniziale"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  inputMode="numeric"
                  className="text-input"
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="pagina-finale">Pagina finale</label>
                <input
                  id="pagina-finale"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  inputMode="numeric"
                  className="text-input"
                />
              </div>
            </div>

            <div className="switch-card">
              <div className="switch-copy">
                <span className="switch-title">Escludi numeri</span>
                <span className="switch-subtitle">
                  Se attivo, una pagina già uscita non verrà estratta di nuovo fino al reset.
                </span>
              </div>

              <button
                type="button"
                className={`switch ${removeAfter ? 'switch-on' : 'switch-off'}`}
                onClick={() => setRemoveAfter((prev) => !prev)}
                aria-pressed={removeAfter}
                aria-label="Escludi numeri già usciti"
              >
                <span className="switch-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
