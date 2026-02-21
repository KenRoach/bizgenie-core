import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import QRCode from "qrcode";

const CONNECTOR_URL = import.meta.env.VITE_WHATSAPP_CONNECTOR_URL || "";

interface WhatsAppSession {
  userId: string;
  phoneNumber?: string;
  status: string;
}

export default function WhatsAppConnect({ businessId }: { businessId: string }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  /* ─── Fetch sessions ─── */
  const fetchSessions = useCallback(async () => {
    if (!CONNECTOR_URL) return;
    setLoadingSessions(true);
    try {
      const res = await fetch(`${CONNECTOR_URL}/whatsapp/sessions`);
      if (res.ok) {
        const data: WhatsAppSession[] = await res.json();
        setSessions(data);
        const active = data.find((s) => s.status === "connected");
        if (active) {
          setConnected(true);
          setPhoneNumber(active.phoneNumber || null);
        }
      }
    } catch {
      /* silent */
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* ─── SSE connect ─── */
  const startConnect = () => {
    if (!CONNECTOR_URL) return;
    setShowConnect(true);
    setConnecting(true);

    const es = new EventSource(`${CONNECTOR_URL}/whatsapp/connect?businessId=${businessId}`);
    sseRef.current = es;

    es.addEventListener("qr", (e: MessageEvent) => {
      const qrData = e.data;
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, qrData, {
          width: 220,
          margin: 2,
          color: { dark: "#ffffff", light: "#00000000" },
        });
      }
    });

    es.addEventListener("connected", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setPhoneNumber(payload.phoneNumber || null);
      } catch {
        /* ignore */
      }
      setConnected(true);
      setConnecting(false);
      setShowConnect(false);
      closeSse();
      fetchSessions();
    });

    es.onerror = () => {
      setConnecting(false);
    };
  };

  const closeSse = () => {
    sseRef.current?.close();
    sseRef.current = null;
  };

  const cancelConnect = () => {
    closeSse();
    setShowConnect(false);
    setConnecting(false);
  };

  /* ─── Delete session ─── */
  const deleteSession = async (userId: string) => {
    if (!CONNECTOR_URL) return;
    setDeletingSession(userId);
    try {
      await fetch(`${CONNECTOR_URL}/whatsapp/sessions/${userId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.userId !== userId));
      if (sessions.length <= 1) {
        setConnected(false);
        setPhoneNumber(null);
      }
    } catch {
      /* silent */
    } finally {
      setDeletingSession(null);
    }
  };

  /* ─── Cleanup ─── */
  useEffect(() => () => closeSse(), []);

  return (
    <div className="hidden md:block bg-card border border-border rounded-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">WhatsApp</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-success animate-pulse-glow" : "bg-destructive"
            }`}
          />
          <span className="text-[10px] font-mono text-muted-foreground">
            {connected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Connected state */}
        {connected && !showConnect && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-secondary/40 border border-border/50">
            <CheckCircle className="w-5 h-5 text-success shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Connected to KITZ</p>
              {phoneNumber && (
                <p className="text-[11px] font-mono text-muted-foreground">{phoneNumber}</p>
              )}
            </div>
          </div>
        )}

        {/* Connect button */}
        {!connected && !showConnect && (
          <button
            onClick={startConnect}
            disabled={!CONNECTOR_URL}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
          >
            <Wifi className="w-4 h-4" />
            Connect WhatsApp
          </button>
        )}

        {/* QR inline section */}
        {showConnect && (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-secondary rounded-lg p-4">
              <canvas ref={canvasRef} className="mx-auto" />
              {connecting && !canvasRef.current?.getContext("2d")?.getImageData(0, 0, 1, 1).data[3] && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Open WhatsApp → Settings → Linked Devices → <strong className="text-foreground">Scan QR Code</strong>
            </p>
            <button
              onClick={cancelConnect}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        )}

        {/* Sessions list */}
        {sessions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Active Sessions
            </p>
            {sessions.map((session) => (
              <div
                key={session.userId}
                className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/40 border border-border/50"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    session.status === "connected"
                      ? "bg-success animate-pulse-glow"
                      : "bg-muted-foreground/40"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {session.phoneNumber || session.userId}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">{session.status}</p>
                </div>
                <button
                  onClick={() => deleteSession(session.userId)}
                  disabled={deletingSession === session.userId}
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  {deletingSession === session.userId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {loadingSessions && sessions.length === 0 && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
