"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import TopBar from "@/components/TopBar";

type Message = {
  type: "success" | "error";
  text: string;
};

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => setName(session?.user?.name ?? ""));
  }, [session?.user?.name]);

  const changingPassword = currentPassword || newPassword || confirmPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Erro ao salvar perfil." });
        return;
      }

      setName(data.user.name);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await update({ user: { name: data.user.name } });
      setMessage({ type: "success", text: data.message });
    } catch {
      setMessage({ type: "error", text: "Erro ao salvar perfil." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Meu Perfil" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6">
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center ${
            message.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl p-5 border space-y-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Dados da conta</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Atualize como seu nome aparece nos bolões e altere sua senha quando precisar.
            </p>
          </div>

          <div>
            <label htmlFor="profile-name" className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Nome
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              className="input-field"
              maxLength={80}
              required
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              E-mail
            </label>
            <input
              id="profile-email"
              value={session?.user?.email ?? ""}
              type="email"
              className="input-field opacity-70"
              disabled
              readOnly
            />
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              O e-mail é usado para login e recuperação de senha. Por enquanto, ele fica protegido contra alteração direta.
            </p>
          </div>

          <div className="pt-2 border-t space-y-4" style={{ borderColor: "var(--border-base)" }}>
            <div>
              <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Trocar senha</h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Preencha estes campos apenas se quiser alterar a senha.
              </p>
            </div>

            <div>
              <label htmlFor="current-password" className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Senha atual
              </label>
              <input
                id="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Nova senha
              </label>
              <input
                id="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                className="input-field"
                minLength={changingPassword ? 6 : undefined}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                autoComplete="new-password"
                className="input-field"
                minLength={changingPassword ? 6 : undefined}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>

      </main>
    </div>
  );
}
