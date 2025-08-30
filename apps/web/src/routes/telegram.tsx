import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

type Status = { configured: boolean; loggedIn: boolean };

export const Route = createFileRoute("/telegram")({
  component: RouteComponent,
});

function RouteComponent() {
  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE ?? "", []);
  const [status, setStatus] = useState<Status>({ configured: false, loggedIn: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginId, setLoginId] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "code" | "2fa" | "done">("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  async function fetchStatus() {
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/telegram/status`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as Status;
      setStatus(data);
    } catch (e: any) {
      setError(e?.message || "Error");
    }
  }

  useEffect(() => {
    void fetchStatus();
  }, []);

  async function startLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/telegram/login/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `status ${res.status}`);
      setLoginId(data.loginId);
      setStep("code");
    } catch (e: any) {
      setError(e?.message || "Error al iniciar login");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!loginId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/telegram/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `status ${res.status}`);
      if (data.status === "2fa_required") {
        setStep("2fa");
      } else {
        setStep("done");
        await fetchStatus();
      }
    } catch (e: any) {
      setError(e?.message || "Error al verificar código");
    } finally {
      setLoading(false);
    }
  }

  async function verify2FA(e: React.FormEvent) {
    e.preventDefault();
    if (!loginId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/telegram/login/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `status ${res.status}`);
      setStep("done");
      await fetchStatus();
    } catch (e: any) {
      setError(e?.message || "Error con la contraseña 2FA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-xl">
      <h1 className="text-2xl font-semibold mb-2">Telegram</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Estado: {status.configured ? "configurado" : "no configurado"} · Sesión: {status.loggedIn ? "activa" : "no activa"}
      </p>
      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

      {step === "idle" && (
        <form onSubmit={startLogin} className="flex gap-2 items-end">
          <label className="flex-1">
            <span className="block text-sm mb-1">Teléfono (formato internacional)</span>
            <input
              className="w-full bg-transparent border rounded p-2"
              placeholder="+34600111222"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <button className="border rounded px-3 py-2" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={verifyCode} className="flex gap-2 items-end">
          <label className="flex-1">
            <span className="block text-sm mb-1">Código recibido</span>
            <input
              className="w-full bg-transparent border rounded p-2"
              placeholder="12345"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          <button className="border rounded px-3 py-2" disabled={loading}>
            {loading ? 'Verificando…' : 'Verificar'}
          </button>
        </form>
      )}

      {step === "2fa" && (
        <form onSubmit={verify2FA} className="flex gap-2 items-end">
          <label className="flex-1">
            <span className="block text-sm mb-1">Contraseña 2FA</span>
            <input
              type="password"
              className="w-full bg-transparent border rounded p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="border rounded px-3 py-2" disabled={loading}>
            {loading ? 'Verificando…' : 'Confirmar'}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-4">
          <div className="text-green-400">Sesión configurada correctamente.</div>
        </div>
      )}
    </div>
  );
}

