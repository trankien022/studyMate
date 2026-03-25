import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Timer, Play, Pause, RotateCcw, Coffee, BookOpen, Settings } from 'lucide-react';

const PRESETS = {
  pomodoro: { label: 'Học tập', minutes: 25, icon: BookOpen, color: 'var(--color-primary-500)' },
  shortBreak: { label: 'Nghỉ ngắn', minutes: 5, icon: Coffee, color: 'var(--color-success)' },
  longBreak: { label: 'Nghỉ dài', minutes: 15, icon: Coffee, color: 'var(--color-info)' },
};

export default function PomodoroTimer() {
  const [mode, setMode] = useState('pomodoro');
  const [timeLeft, setTimeLeft] = useState(PRESETS.pomodoro.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [customTimes, setCustomTimes] = useState({
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
  });
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Play notification sound
  const playNotification = useCallback(() => {
    try {
      // Use Web Audio API for notification
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
      
      // Play a second tone
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(1000, ctx.currentTime);
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch {
      // Fallback: no sound
    }
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playNotification();

      if (mode === 'pomodoro') {
        const newSessions = sessions + 1;
        setSessions(newSessions);
        toast.success(`🎉 Hoàn thành phiên học #${newSessions}! Nghỉ ngơi thôi!`);
        
        // Auto switch to break
        if (newSessions % 4 === 0) {
          switchMode('longBreak');
        } else {
          switchMode('shortBreak');
        }
      } else {
        toast('⏰ Hết giờ nghỉ! Tiếp tục học thôi!', { icon: '📚' });
        switchMode('pomodoro');
      }
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, mode, sessions, playNotification]);

  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(customTimes[newMode] * 60);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(customTimes[mode] * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = 1 - timeLeft / (customTimes[mode] * 60);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  const handleSaveSettings = () => {
    setTimeLeft(customTimes[mode] * 60);
    setIsRunning(false);
    setShowSettings(false);
    toast.success('Đã lưu cài đặt!');
  };

  return (
    <div className="pomodoro-tab animate-fade-in">
      <div className="pomodoro-container">
        {/* Header */}
        <div className="pomodoro-header">
          <h2>
            <Timer size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Pomodoro Timer
          </h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowSettings(!showSettings)}
            title="Cài đặt"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="pomodoro-settings card animate-fade-in-up">
            <h3>Cài đặt thời gian (phút)</h3>
            <div className="settings-grid">
              <div className="form-group">
                <label htmlFor="pomo-time">Học tập</label>
                <input
                  id="pomo-time"
                  type="number"
                  className="input"
                  min={1}
                  max={120}
                  value={customTimes.pomodoro}
                  onChange={(e) => setCustomTimes({ ...customTimes, pomodoro: parseInt(e.target.value) || 25 })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="short-break">Nghỉ ngắn</label>
                <input
                  id="short-break"
                  type="number"
                  className="input"
                  min={1}
                  max={30}
                  value={customTimes.shortBreak}
                  onChange={(e) => setCustomTimes({ ...customTimes, shortBreak: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="long-break">Nghỉ dài</label>
                <input
                  id="long-break"
                  type="number"
                  className="input"
                  min={1}
                  max={60}
                  value={customTimes.longBreak}
                  onChange={(e) => setCustomTimes({ ...customTimes, longBreak: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSaveSettings}>
              Lưu cài đặt
            </button>
          </div>
        )}

        {/* Mode selector */}
        <div className="pomodoro-modes">
          {Object.entries(PRESETS).map(([key, preset]) => {
            const Icon = preset.icon;
            return (
              <button
                key={key}
                className={`pomodoro-mode-btn ${mode === key ? 'active' : ''}`}
                onClick={() => switchMode(key)}
                style={mode === key ? { '--mode-color': preset.color } : {}}
              >
                <Icon size={14} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Timer circle */}
        <div className="pomodoro-timer-display">
          <svg className="pomodoro-ring" viewBox="0 0 260 260">
            {/* Background circle */}
            <circle
              cx="130"
              cy="130"
              r="120"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="4"
            />
            {/* Progress circle */}
            <circle
              cx="130"
              cy="130"
              r="120"
              fill="none"
              stroke={PRESETS[mode].color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 130 130)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="pomodoro-time-text">
            <span className="pomodoro-time">{formatTime(timeLeft)}</span>
            <span className="pomodoro-mode-label">{PRESETS[mode].label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="pomodoro-controls">
          <button
            className="btn btn-ghost btn-icon pomodoro-ctrl-btn"
            onClick={resetTimer}
            title="Đặt lại"
          >
            <RotateCcw size={20} />
          </button>
          <button
            id="pomodoro-play-btn"
            className={`btn pomodoro-play-btn ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
            onClick={toggleTimer}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
            <span>{isRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
          </button>
          <div className="pomodoro-session-count">
            <span className="session-number">{sessions}</span>
            <span className="session-label">phiên</span>
          </div>
        </div>

        {/* Stats */}
        <div className="pomodoro-stats">
          <div className="pomodoro-stat-card">
            <span className="stat-value">{sessions}</span>
            <span className="stat-label">Phiên hoàn thành</span>
          </div>
          <div className="pomodoro-stat-card">
            <span className="stat-value">{sessions * customTimes.pomodoro}</span>
            <span className="stat-label">Phút tập trung</span>
          </div>
          <div className="pomodoro-stat-card">
            <span className="stat-value">{Math.floor(sessions / 4)}</span>
            <span className="stat-label">Chu kỳ hoàn tất</span>
          </div>
        </div>
      </div>
    </div>
  );
}
