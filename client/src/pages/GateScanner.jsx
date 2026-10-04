import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, LogOut, ScanLine, ShieldCheck, WifiOff, XCircle } from 'lucide-react';
import { assignedGateFor } from '../../../shared/access.mjs';
import { useAuth } from '../context/AuthContext';
import { useData } from '../hooks/useData';
import { post } from '../services/api';
import AppLoader from '../components/AppLoader';
import { pretty } from '../components/UI';
import crest from '../assets/logo.jpeg';
import './GateScanner.css';

const defaultResetDelay = 3000;
const configuredResetDelay = Number(import.meta.env.VITE_SCANNER_RESET_MS);
const resetDelay = Number.isFinite(configuredResetDelay)
  ? Math.min(10000, Math.max(1500, configuredResetDelay))
  : defaultResetDelay;

function tokenFromScan(raw) {
  const value = raw.trim();
  if (/^[a-fA-F0-9]{64}$/.test(value)) return value.toLowerCase();
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 3 || parts[0] !== 'gate' || parts[1] !== 'verify' || !/^[a-fA-F0-9]{64}$/.test(parts[2])) return null;
  return parts[2].toLowerCase();
}

function unlockAudio(audioContext) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext.current) audioContext.current = new AudioContextClass();
    void audioContext.current.resume().catch(() => {});
  } catch {
    // Audio is optional; scanner decisions never depend on sound playback.
  }
}

function playBeep(success, audioContext) {
  try {
    const context = audioContext.current;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = success ? 880 : 260;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.23);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  } catch {
    // Audio is optional; scanner decisions never depend on sound playback.
  }
}

export default function GateScanner() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const settings = useData('/settings');
  const scannerInput = useRef(null);
  const resetTimer = useRef(null);
  const processing = useRef(false);
  const audioContext = useRef(null);
  const [buffer, setBuffer] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [gate, setGate] = useState(() => assignedGateFor(user) || searchParams.get('gate') || 'Main Gate');
  const [state, setState] = useState('READY');
  const [result, setResult] = useState(null);

  const assignedGate = assignedGateFor(user);
  const gates = settings.data?.gates?.length ? settings.data.gates : [assignedGate || 'Main Gate'];

  useEffect(() => {
    const requestedGate = searchParams.get('gate');
    setGate(assignedGate || (gates.includes(requestedGate) ? requestedGate : gates[0]));
  }, [assignedGate, settings.data, searchParams]);

  useEffect(() => {
    if (!['READY','SCANNING'].includes(state)) return undefined;
    scannerInput.current?.focus({ preventScroll: true });
    const refocus = () => {
      const active = document.activeElement;
      const usingControl = active !== scannerInput.current && active?.matches?.('input,select,textarea,button,[contenteditable="true"]');
      if (!document.hidden && !processing.current && !usingControl) scannerInput.current?.focus({ preventScroll: true });
    };
    const onPointerUp = () => window.setTimeout(refocus, 250);
    window.addEventListener('focus', refocus);
    window.addEventListener('pointerup', onPointerUp);
    document.addEventListener('visibilitychange', refocus);
    return () => {
      window.removeEventListener('focus', refocus);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('visibilitychange', refocus);
    };
  }, [state]);

  useEffect(() => () => {
    window.clearTimeout(resetTimer.current);
    audioContext.current?.close().catch(() => {});
  }, []);

  function reset() {
    processing.current = false;
    setResult(null);
    setBuffer('');
    setState('READY');
    window.setTimeout(() => scannerInput.current?.focus({ preventScroll: true }), 0);
  }

  function finish(nextState, payload) {
    setResult(payload);
    setBuffer('');
    setState(nextState);
    playBeep(nextState === 'EXIT_ALLOWED', audioContext);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(reset, resetDelay);
  }

  async function scan(raw) {
    if (processing.current) return;
    processing.current = true;
    setBuffer('');
    setResult(null);
    const token = tokenFromScan(raw);
    if (!token) {
      finish('EXIT_DENIED', { message: 'Invalid QR code. Scan a valid school Gate Pass.' });
      return;
    }
    setState('VERIFYING');
    try {
      const response = await post('/gatepasses/scan', { token, gate });
      finish('EXIT_ALLOWED', response);
    } catch (error) {
      const response = error.response?.data;
      if (!error.response) {
        finish('SERVER_ERROR', { message: 'Unable to confirm the scan result. Check the pass status before retrying.' });
      } else {
        finish('EXIT_DENIED', { message: response?.message || 'Gate Pass was denied.', reason: response?.reason });
      }
    }
  }

  function handleScannerKeyDown(event) {
    if (event.key.length === 1) unlockAudio(audioContext);
    if (event.key === 'Enter') {
      event.preventDefault();
      const raw = event.currentTarget.value || buffer;
      event.currentTarget.value = '';
      void scan(raw);
    } else if (event.key === 'Escape') {
      event.currentTarget.value = '';
      setBuffer('');
    }
  }

  const inResult = ['EXIT_ALLOWED', 'EXIT_DENIED', 'SERVER_ERROR'].includes(state);
  const isReady = state === 'READY';
  const statusLabel = state === 'VERIFYING' ? 'VERIFYING' : state === 'EXIT_ALLOWED' ? 'EXIT ALLOWED' : state === 'EXIT_DENIED' ? 'EXIT DENIED' : state === 'SERVER_ERROR' ? 'SERVER ERROR' : state;

  return (
    <main className="scanner-kiosk" onClick={event => {
      if (event.target === event.currentTarget && isReady) scannerInput.current?.focus({ preventScroll: true });
    }}>
      <input
        ref={scannerInput}
        className="scanner-capture"
        aria-label="QR scanner keyboard input"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
        value={buffer}
        onChange={event => { setBuffer(event.target.value); setState(event.target.value ? 'SCANNING' : 'READY'); }}
        onKeyDown={handleScannerKeyDown}
        onPaste={event => {
          event.preventDefault();
          void scan(event.clipboardData.getData('text'));
        }}
      />
      <header className="scanner-topbar">
        <div className="scanner-brand"><img src={crest} alt="Shree Ram Public School"/><div><strong>SHREE RAM PUBLIC SCHOOL</strong><span>SMART GATE PASS</span></div></div>
        <div className="scanner-controls">
          <label>Gate
            <select aria-label="Scanner gate" value={gate} disabled={Boolean(assignedGate)} onChange={event => { setGate(event.target.value); scannerInput.current?.focus({ preventScroll: true }); }}>
              {gates.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <span className={`scanner-status scanner-status-${state.toLowerCase()}`} role="status"><i/>{statusLabel}</span>
          <button className="scanner-logout" onClick={() => logout().catch(() => {})}><LogOut size={17}/> Sign out</button>
        </div>
      </header>
      <section className={`scanner-panel scanner-panel-${state.toLowerCase()}`} aria-live="polite">
        {!inResult && <>
          <div className="scanner-eyebrow"><ShieldCheck size={17}/> GATE PASS VERIFICATION</div>
          <h1>{state === 'VERIFYING' ? 'Verifying Gate Pass' : 'Gate security scanner'}</h1>
          <p className="scanner-intro">{state === 'VERIFYING' ? 'Checking pass status and recording the exit securely.' : 'Scan the QR code on the student’s approved Gate Pass.'}</p>
          <div className={`scanner-visual ${state === 'VERIFYING' ? 'is-verifying' : ''}`}>
            {state === 'VERIFYING' ? <AppLoader label="Verifying pass…"/> : <><ScanLine size={88} strokeWidth={1.4}/><span className="scanner-frame scanner-frame-one"/><span className="scanner-frame scanner-frame-two"/></>}
          </div>
          <div className="scanner-ready-text">{state === 'VERIFYING' ? 'PLEASE WAIT' : state === 'SCANNING' ? 'SCANNING' : 'READY TO SCAN'}</div>
          <p className="scanner-hint">Present the Gate Pass QR to the POSLOW T-6900 scanner.</p>
        </>}
        {inResult && state === 'EXIT_ALLOWED' && <>
          <div className="scanner-result-icon success"><CheckCircle2 size={76}/></div>
          <div className="scanner-result-heading">EXIT ALLOWED</div>
          <p className="scanner-result-message">Gate Pass verified and exit recorded.</p>
          <div className="scanner-student-name">{result.student.name}</div>
          <div className="scanner-facts">
            <div><span>Admission No.</span><strong>{result.student.admissionNo}</strong></div>
            <div><span>Class</span><strong>{result.student.className}-{result.student.section}</strong></div>
            <div><span>Gate Pass</span><strong>{result.gatePass.passNumber}</strong></div>
            <div><span>Reason</span><strong>{result.gatePass.reason}</strong></div>
            <div><span>Exit time</span><strong>{new Date(result.gatePass.exitTime).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'})}</strong></div>
            <div><span>Gate</span><strong>{result.gatePass.gate}</strong></div>
          </div>
        </>}
        {inResult && state === 'EXIT_DENIED' && <>
          <div className="scanner-result-icon denied"><XCircle size={76}/></div>
          <div className="scanner-result-heading">EXIT DENIED</div>
          <p className="scanner-result-message">{result.message}</p>
          {result.reason && <p className="scanner-result-code">{pretty(result.reason)}</p>}
        </>}
        {inResult && state === 'SERVER_ERROR' && <>
          <div className="scanner-result-icon unavailable"><WifiOff size={76}/></div>
          <div className="scanner-result-heading">VERIFICATION FAILED</div>
          <p className="scanner-result-message">{result.message}</p>
        </>}
        {inResult && <div className="scanner-auto-reset">Returning to READY TO SCAN…</div>}
      </section>
      {import.meta.env.DEV && <form className="scanner-test" onClick={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); void scan(manualValue); setManualValue(''); }}>
        <label htmlFor="scanner-test-input">Development test scan</label>
        <input id="scanner-test-input" value={manualValue} onChange={event => setManualValue(event.target.value)} placeholder="Paste a Gate Pass QR URL or token"/>
        <button disabled={!isReady}>Test Scan</button>
      </form>}
      <footer className="scanner-footer"><span><ShieldCheck size={15}/> Only an authenticated, authorized exit scan can record student movement.</span><span>{user?.name}</span></footer>
    </main>
  );
}
