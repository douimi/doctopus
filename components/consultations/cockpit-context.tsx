'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/**
 * Client state shared by the consultation page's islands: the sticky
 * header (save indicator, AI toggle, dossier sheet trigger), the
 * editor (publishes its save state), the patient context rail and the
 * AI drawer. The page itself stays a server component; only this
 * provider and the small islands under it are client code.
 */

export type SaveState =
  | { status: 'idle' }
  | { status: 'dirty' }
  | { status: 'saving' }
  | { status: 'saved'; at: Date }
  | { status: 'error'; error: string };

type CockpitValue = {
  saveState: SaveState;
  setSaveState: (s: SaveState) => void;
  aiAvailable: boolean;
  aiOpen: boolean;
  setAiOpen: (open: boolean) => void;
  contextOpen: boolean;
  setContextOpen: (open: boolean) => void;
};

const CockpitContext = createContext<CockpitValue | null>(null);

export function useCockpit(): CockpitValue {
  const v = useContext(CockpitContext);
  if (!v) throw new Error('useCockpit must be used inside <CockpitProvider>');
  return v;
}

// --- AI drawer open state, remembered per browser -------------------
// localStorage can throw (private mode, blocked storage) — an
// in-memory value keeps the toggle working for the session anyway.
const AI_OPEN_KEY = 'doctopus:consultation-ai-open';
const aiListeners = new Set<() => void>();
let aiMemory: boolean | null = null;

function readAiOpen(): boolean {
  if (aiMemory !== null) return aiMemory;
  try {
    aiMemory = window.localStorage.getItem(AI_OPEN_KEY) === '1';
  } catch {
    aiMemory = false;
  }
  return aiMemory;
}

function writeAiOpen(open: boolean) {
  aiMemory = open;
  try {
    window.localStorage.setItem(AI_OPEN_KEY, open ? '1' : '0');
  } catch {
    // ignore — memory fallback above
  }
  aiListeners.forEach((l) => l());
}

function subscribeAiOpen(cb: () => void) {
  aiListeners.add(cb);
  return () => {
    aiListeners.delete(cb);
  };
}

export function CockpitProvider({
  aiAvailable,
  children,
}: {
  aiAvailable: boolean;
  children: ReactNode;
}) {
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [contextOpen, setContextOpen] = useState(false);
  const storedAiOpen = useSyncExternalStore(subscribeAiOpen, readAiOpen, () => false);
  const aiOpen = aiAvailable && storedAiOpen;
  const setAiOpen = useCallback((open: boolean) => writeAiOpen(open), []);

  // The rail and AI drawer stick just under the header, whose height
  // varies (allergy chips wrap). Expose it as a CSS variable.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    const header = root?.querySelector<HTMLElement>('[data-cockpit-header]');
    if (!root || !header) return;
    const ro = new ResizeObserver(() => {
      root.style.setProperty('--cockpit-header-h', `${header.offsetHeight}px`);
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  const value = useMemo(
    () => ({
      saveState,
      setSaveState,
      aiAvailable,
      aiOpen,
      setAiOpen,
      contextOpen,
      setContextOpen,
    }),
    [saveState, aiAvailable, aiOpen, setAiOpen, contextOpen],
  );

  return (
    <CockpitContext.Provider value={value}>
      <div ref={rootRef} className="min-h-dvh">
        {children}
      </div>
    </CockpitContext.Provider>
  );
}
