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

function KineticIrisScanner({ state }) {
  const isVerifying = state === 'VERIFYING';

  return (
    <div className={`scanner-iris-stage stage-${state.toLowerCase()}`} aria-hidden="true">
      <div className="scanner-iris-halo" />
      <div className="scanner-iris-basin">
        <div className="kinetic-iris-main">
          {/* Symmetrical capsule tracks with mask-image (9 dual-capsule tracks = 18 slots) */}
          <div className="kinetic-loaders">
            {Array.from({ length: 9 }, (_, index) => (
              <div key={index} className={`kinetic-loader loader-${index}`} />
            ))}
          </div>
          {/* Radial kinetic oscillating spheres (18 balls spanning the entire 360° dial) */}
          <div className="kinetic-loadersB">
            {Array.from({ length: 18 }, (_, index) => (
              <div key={index} className={`kinetic-loaderA loaderA-${index}`}>
                <div className={`kinetic-ball ball${index}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Central Holographic Target Reticle */}
        <div className="kinetic-center-target">
          <div className="kinetic-reticle-ring ring-outer" />
          <div className="kinetic-reticle-ring ring-inner" />
          <div className="kinetic-laser-sweep" />
          <div className="kinetic-corner corner-tl" />
          <div className="kinetic-corner corner-tr" />
          <div className="kinetic-corner corner-bl" />
          <div className="kinetic-corner corner-br" />
          <div className="kinetic-target-core">
            {isVerifying ? (
              <AppLoader label="" />
            ) : (
              <ScanLine size={32} className="kinetic-scan-icon" strokeWidth={1.8} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GateScanner() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const settings = useData('/settings');
  const scannerInput = useRef(null);
  const resetTimer = useRef(null);
  const scanTimer = useRef(null);
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
    const captureKey = event => {
      if (processing.current || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      const active = document.activeElement;
      if (active === scannerInput.current || active?.matches?.('input,select,textarea,[contenteditable="true"]')) return;
      // Preserve the first character even when keydown targeted the page/button.
      event.preventDefault();
      setBuffer(event.key);
      setState('SCANNING');
      scannerInput.current?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', captureKey, true);
    window.addEventListener('focus', refocus);
    window.addEventListener('pointerup', onPointerUp);
    document.addEventListener('visibilitychange', refocus);
    return () => {
      window.removeEventListener('keydown', captureKey, true);
      window.removeEventListener('focus', refocus);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('visibilitychange', refocus);
    };
  }, [state]);

  useEffect(() => () => {
    window.clearTimeout(resetTimer.current);
    window.clearTimeout(scanTimer.current);
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
    window.clearTimeout(scanTimer.current);
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
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const raw = event.currentTarget.value || buffer;
      event.currentTarget.value = '';
      if (raw.trim()) void scan(raw);
    } else if (event.key === 'Escape') {
      event.currentTarget.value = '';
      setBuffer('');
      window.clearTimeout(scanTimer.current);
      if (!processing.current) setState('READY');
    }
  }

  const inResult = ['EXIT_ALLOWED', 'EXIT_DENIED', 'SERVER_ERROR'].includes(state);
  const isReady = state === 'READY';
  const statusLabel = state === 'VERIFYING' ? 'VERIFYING' : state === 'EXIT_ALLOWED' ? 'EXIT ALLOWED' : state === 'EXIT_DENIED' ? 'EXIT DENIED' : state === 'SERVER_ERROR' ? 'SERVER ERROR' : state;

  return (
    <main className="scanner-kiosk" onClick={event => {
      if (event.target === event.currentTarget && isReady) scannerInput.current?.focus({ preventScroll: true });
    }}>
      <header className="scanner-topbar">
        <div className="scanner-brand"><img src={crest} alt="Shree Ram Public School"/><div><strong>SHREE RAM PUBLIC SCHOOL</strong><span>SMART GATE PASS</span></div></div>
        <div className="scanner-controls">
          <label>Gate
            <select aria-label="Scanner gate" value={gate} disabled={Boolean(assignedGate)} onChange={event => { setGate(event.target.value); scannerInput.current?.focus({ preventScroll: true }); }}>
              {gates.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <span className={`scanner-status scanner-status-${state.toLowerCase()}`} role="status"><i/>{statusLabel}</span>
        </div>
      </header>
      <input
        ref={scannerInput}
        className="scanner-capture"
        readOnly={processing.current}
        aria-label="QR scanner keyboard input"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
        value={buffer}
        onChange={event => {
          if (processing.current) return;
          const raw = event.target.value;
          setBuffer(raw);
          setState(raw ? 'SCANNING' : 'READY');
          window.clearTimeout(scanTimer.current);
          // Some keyboard scanners send no Enter suffix. Wait until a complete,
          // valid payload stops changing; never submit a partial scan.
          if (tokenFromScan(raw)) scanTimer.current = window.setTimeout(() => void scan(raw), 300);
        }}
        onKeyDown={handleScannerKeyDown}
        onPaste={event => {
          event.preventDefault();
          void scan(event.clipboardData.getData('text'));
        }}
      />
      <section className={`scanner-panel scanner-panel-${state.toLowerCase()}`} aria-live="polite">
        {!inResult && <>
          <div className="scanner-eyebrow"><ShieldCheck size={17}/> GATE PASS VERIFICATION</div>
          <h1>{state === 'VERIFYING' ? 'Verifying Gate Pass' : 'Gate security scanner'}</h1>
          <p className="scanner-intro">{state === 'VERIFYING' ? 'Checking pass status and recording the exit securely.' : 'Scan the QR code on the student’s approved Gate Pass.'}</p>
          <KineticIrisScanner state={state} />
          <div className={`scanner-ready-pill scanner-ready-${state.toLowerCase()}`} role="status">
            <span className="scanner-beacon">
              <span className="scanner-beacon-ping" />
              <span className="scanner-beacon-dot" />
            </span>
            <span className="scanner-ready-label">
              {state === 'VERIFYING' ? 'VERIFYING PASS…' : state === 'SCANNING' ? 'READING QR CODE…' : 'READY TO SCAN'}
            </span>
          </div>
          <p className="scanner-hint">Present the Gate Pass QR to the POSLOW T-6900 scanner.</p>
          {state !== 'VERIFYING' && (
            <button
              type="button"
              className="scanner-activate-btn"
              onClick={() => {
                unlockAudio(audioContext);
                scannerInput.current?.focus({ preventScroll: true });
              }}
            >
              <ScanLine size={18} />
              <span>Activate scanner</span>
            </button>
          )}
          {state !== 'VERIFYING' && (
            <p className="scanner-hint scanner-subhint">If the scanner beeps without a result, click Activate scanner and scan again.</p>
          )}
        </>}
        {inResult && state === 'EXIT_ALLOWED' && <>
          <div className="scanner-result-icon success"><CheckCircle2 size={76}/></div>
          <div className="scanner-result-heading">EXIT ALLOWED</div>
          <p className="scanner-result-message">Gate Pass verified and exit recorded.</p>
          <div className="scanner-student-name">{result.staff?.name || result.student?.name}</div>
          <div className="scanner-facts">
            {result.staff ? <>
              <div><span>Staff ID</span><strong>{result.staff.employeeId}</strong></div>
              <div><span>Department</span><strong>{result.staff.department}</strong></div>
            </> : <>
              <div><span>Admission No.</span><strong>{result.student?.admissionNo}</strong></div>
              <div><span>Class</span><strong>{result.student?.className}-{result.student?.section}</strong></div>
            </>}
            <div><span>Gate Pass</span><strong>{result.gatePass?.passNumber}</strong></div>
            <div><span>Reason</span><strong>{result.gatePass?.reason}</strong></div>
            <div><span>Exit time</span><strong>{new Date(result.gatePass?.exitTime).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'})}</strong></div>
            <div><span>Gate</span><strong>{result.gatePass?.gate}</strong></div>
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
      <footer className="scanner-footer"><span><ShieldCheck size={15}/> Only an authenticated, authorized exit scan can record student movement.</span><div className="scanner-footer-account"><span>{user?.name}</span><button className="scanner-logout" onClick={() => logout().catch(() => {})}><LogOut size={17}/> Sign out</button></div></footer>
    </main>
  );
}
