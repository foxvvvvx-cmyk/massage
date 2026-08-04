"use client";

import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Loader2, LogIn } from "lucide-react";

type SitePasswordGateProps = {
    children: ReactNode;
};

type GateStatus = "checking" | "locked" | "unlocked" | "unreachable";

const gateRootFallbackStyle: CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const gatePanelFallbackStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    textAlign: "center",
};

export function SitePasswordGate({ children }: SitePasswordGateProps) {
    const [status, setStatus] = useState<GateStatus>("checking");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function refreshStatus() {
        try {
            const res = await fetch("/api/auth/site-status", { cache: "no-store" });
            const data = await res.json() as { required?: boolean; unlocked?: boolean };
            setStatus(!data.required || data.unlocked ? "unlocked" : "locked");
        } catch {
            setStatus("unreachable");
        }
    }

    useEffect(() => {
        void refreshStatus();
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            const res = await fetch("/api/auth/site-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = await res.json() as { ok?: boolean; error?: string };
            if (!data.ok) {
                setError(data.error || "登录失败。");
                return;
            }
            setPassword("");
            setStatus("unlocked");
        } catch {
            setError("网络请求失败，请重试。");
        } finally {
            setBusy(false);
        }
    }

    if (status === "unlocked") return <>{children}</>;

    if (status === "unreachable") {
        return (
            <main className="app-root account-gate-root" style={gateRootFallbackStyle}>
                <section className="account-gate-card account-gate-loading" style={gatePanelFallbackStyle}>
                    <span>网络连接不畅，校验失败</span>
                    <button type="button" className="account-gate-retry-btn" onClick={() => { setStatus("checking"); void refreshStatus(); }}>
                        重试
                    </button>
                </section>
            </main>
        );
    }

    if (status === "checking") {
        return (
            <main className="app-root account-gate-root" style={gateRootFallbackStyle}>
                <section className="account-gate-panel" aria-live="polite" style={gatePanelFallbackStyle}>
                    <Loader2 className="account-gate-spinner" size={24} />
                    <span>正在校验访问密码...</span>
                </section>
            </main>
        );
    }

    return (
        <main className="app-root account-gate-root" style={gateRootFallbackStyle}>
            <section className="account-gate-card" aria-label="访问密码">
                <div className="account-gate-copy">
                    <span>AI PHONE ACCESS</span>
                </div>

                <form className="account-gate-form" onSubmit={handleSubmit}>
                    <label>
                        <span>访问密码</span>
                        <input
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            autoComplete="current-password"
                            type="password"
                            placeholder="请输入访问密码"
                            autoFocus
                        />
                    </label>
                    {error ? <div className="account-gate-error" role="alert">{error}</div> : null}
                    <button type="submit" disabled={busy}>
                        {busy ? <Loader2 size={18} className="account-gate-spinner" /> : <LogIn size={18} />}
                        <span>{busy ? "处理中" : "进入"}</span>
                    </button>
                </form>
            </section>
        </main>
    );
}
