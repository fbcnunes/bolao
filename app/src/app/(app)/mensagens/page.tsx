"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type MessageStatus = "ENVIADA" | "LIDA" | "RESPONDIDA";

type Message = {
  id: string;
  subject: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
  fromUser: { id: string; name: string; email: string };
  toUser: { id: string; name: string; email: string } | null;
  bolao: { id: string; nome: string } | null;
  replies: Array<{
    id: string;
    body: string;
    createdAt: string;
    fromUser: { id: string; name: string };
  }>;
  _count: { replies: number };
};

type Box = "enviadas" | "nova";

export default function MensagensPage() {
  const [box, setBox] = useState<Box>("enviadas");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Nova mensagem
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages?box=sent");
      const d = await res.json();
      setMessages(Array.isArray(d) ? d : []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", "Mensagem enviada com sucesso!");
        setSubject("");
        setBody("");
        setBox("enviadas");
        await fetchMessages();
      } else {
        showToast("error", data.message);
      }
    } catch {
      showToast("error", "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  const statusLabel: Record<MessageStatus, { label: string; class: string }> = {
    ENVIADA:    { label: "Enviada",    class: "bg-slate-500/10 text-slate-400 border border-slate-500/20" },
    LIDA:       { label: "Lida",       class: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
    RESPONDIDA: { label: "Respondida", class: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Mensagens" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-4">
          {(["enviadas", "nova"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setBox(t)}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${box === t ? "bg-brand-primary text-white" : ""}`}
              style={box !== t ? { background: "var(--bg-card2)", color: "var(--text-secondary)" } : {}}
            >
              {t === "enviadas" ? "Minhas mensagens" : "Nova mensagem"}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-medium text-center ${
            toast.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}>
            {toast.text}
          </div>
        )}

        {/* Modal ver conversa */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center p-4 pb-8">
            <div className="rounded-2xl p-5 w-full max-w-sm border flex flex-col gap-3 max-h-[80vh] overflow-y-auto" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{selectedMessage.subject}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {format(new Date(selectedMessage.createdAt), "dd/MM/yyyy · HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <button onClick={() => setSelectedMessage(null)} className="text-xs flex-shrink-0 px-2 py-1 rounded-lg cursor-pointer hover:opacity-70" style={{ background: "var(--bg-card2)", color: "var(--text-muted)" }}>✕</button>
              </div>

              <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bg-card2)", color: "var(--text-primary)" }}>
                {selectedMessage.body}
              </div>

              {selectedMessage.replies.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Respostas do administrador</p>
                  {selectedMessage.replies.map((r) => (
                    <div key={r.id} className="rounded-xl p-3 border-l-2 border-brand-primary/50 text-sm" style={{ background: "var(--bg-card2)" }}>
                      <p className="text-[11px] font-semibold mb-1 text-brand-primary">{r.fromUser.name}</p>
                      <p style={{ color: "var(--text-primary)" }}>{r.body}</p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(r.createdAt), "dd/MM · HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>Aguardando resposta do administrador.</p>
              )}

              <button onClick={() => setSelectedMessage(null)} className="w-full py-2.5 text-sm font-semibold rounded-xl cursor-pointer" style={{ background: "var(--bg-card2)", color: "var(--text-secondary)" }}>Fechar</button>
            </div>
          </div>
        )}

        {/* ── ENVIADAS ── */}
        {box === "enviadas" && (
          <>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--bg-card)" }} />)}</div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl p-10 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
                <p className="text-4xl mb-3">💬</p>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Nenhuma mensagem enviada</p>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Tem uma dúvida ou sugestão? Envie uma mensagem para o administrador.</p>
                <button onClick={() => setBox("nova")} className="text-sm font-semibold text-brand-primary cursor-pointer hover:opacity-80">
                  Enviar mensagem
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const sc = statusLabel[msg.status];
                  const hasReplies = msg._count.replies > 0;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      className="w-full text-left rounded-2xl p-4 border transition-all cursor-pointer active:scale-[0.98]"
                      style={{
                        background: hasReplies && msg.status === "RESPONDIDA" ? "rgba(16,185,129,0.04)" : "var(--bg-card)",
                        borderColor: hasReplies && msg.status === "RESPONDIDA" ? "rgba(16,185,129,0.25)" : "var(--border-base)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{msg.subject}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {format(new Date(msg.createdAt), "dd/MM/yyyy · HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{msg.body}</p>
                        </div>
                        <div className="flex-shrink-0 text-right space-y-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.class}`}>{sc.label}</span>
                          {hasReplies && (
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{msg._count.replies} resposta{msg._count.replies !== 1 ? "s" : ""}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── NOVA MENSAGEM ── */}
        {box === "nova" && (
          <form onSubmit={(e) => void handleSend(e)} className="space-y-4">
            <div className="rounded-2xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border-base)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                Enviar mensagem para o administrador
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }}>Assunto</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Ex: Dúvida sobre as regras"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={sending}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium ml-1 block" style={{ color: "var(--text-secondary)" }}>Mensagem</label>
                  <textarea
                    required
                    className="input-field resize-none"
                    rows={5}
                    placeholder="Descreva sua dúvida, sugestão ou problema..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={sending}
                    maxLength={2000}
                  />
                  <p className="text-[11px] text-right" style={{ color: "var(--text-muted)" }}>{body.length}/2000</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex justify-center items-center"
              disabled={sending || !subject.trim() || !body.trim()}
            >
              {sending ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : "Enviar mensagem"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
