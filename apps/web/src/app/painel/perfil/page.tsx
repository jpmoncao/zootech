"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shell } from "../../../components/shell";
import { perfilLabel } from "../../../lib/access";
import {
  alterarSenha,
  atualizarMe,
  carregarMe,
  ApiError,
  type PublicUser,
} from "../../../lib/api";

export default function Page() {
  return (
    <Shell section="perfil" title="Perfil">
      <Perfil />
    </Shell>
  );
}

function Perfil() {
  const [usuario, setUsuario] = useState<PublicUser | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    carregarMe()
      .then((me) => {
        if (!cancelled) setUsuario(me);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErro(error instanceof ApiError ? error.message : "Não foi possível carregar o perfil.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div>
        <h1>Perfil</h1>
        <p className="lede">Telefone, e-mail e senha. A função é definida pela coordenação.</p>
      </div>
      {erro ? (
        <Alert variant="destructive">
          <AlertDescription className="text-inherit">{erro}</AlertDescription>
        </Alert>
      ) : null}
      {usuario ? (
        <>
          <section className="panel" aria-label="Dados da conta">
            <dl className="meta">
              <div>
                <dt>Nome</dt>
                <dd>{usuario.nome}</dd>
              </div>
              <div>
                <dt>CPF</dt>
                <dd>{usuario.cpfMascarado}</dd>
              </div>
              <div>
                <dt>Matrícula</dt>
                <dd>{usuario.matricula ?? "—"}</dd>
              </div>
              <div>
                <dt>Função</dt>
                <dd>{perfilLabel[usuario.perfilAcesso]}</dd>
              </div>
              {usuario.crmv ? (
                <div>
                  <dt>CRMV</dt>
                  <dd>{usuario.crmv}</dd>
                </div>
              ) : null}
            </dl>
          </section>
          <TelefoneForm
            inicial={usuario.telefone ?? ""}
            onSaved={(telefone) => setUsuario({ ...usuario, telefone })}
          />
          <EmailForm
            inicial={usuario.email}
            onSaved={(email) => setUsuario({ ...usuario, email })}
          />
          <SenhaForm />
        </>
      ) : erro ? null : (
        <p className="hint">Carregando perfil…</p>
      )}
    </>
  );
}

function TelefoneForm({
  inicial,
  onSaved,
}: {
  inicial: string;
  onSaved: (telefone: string | null) => void;
}) {
  const [telefone, setTelefone] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const digits = telefone.replace(/\D/g, "");
    setOk(false);
    if (digits.length !== 0 && (digits.length < 10 || digits.length > 11)) {
      setErro("Telefone deve ter 10 ou 11 dígitos, ou ficar vazio.");
      return;
    }
    setErro(null);
    setPending(true);
    try {
      const user = await atualizarMe({ telefone: digits });
      onSaved(user.telefone);
      setTelefone(user.telefone ?? "");
      setOk(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar o telefone.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="field">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          className="mono"
          inputMode="numeric"
          autoComplete="tel"
          value={telefone}
          aria-invalid={erro ? true : undefined}
          onChange={(event) => {
            setTelefone(event.target.value);
            setErro(null);
            setOk(false);
          }}
        />
        <p className="hint">Vazio ou 10 a 11 dígitos.</p>
      </div>
      {erro ? <p className="error-text">{erro}</p> : null}
      {ok ? (
        <Alert variant="success" role="status">
          <AlertDescription className="text-inherit">Telefone atualizado.</AlertDescription>
        </Alert>
      ) : null}
      <div className="actions">
        <Button type="submit" disabled={pending}>
          Salvar telefone
        </Button>
      </div>
    </form>
  );
}

function EmailForm({
  inicial,
  onSaved,
}: {
  inicial: string;
  onSaved: (email: string) => void;
}) {
  const [email, setEmail] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setOk(false);
    const value = email.trim().toLowerCase();
    if (!value.endsWith(".gov.br")) {
      setErro("E-mail institucional deve terminar em .gov.br.");
      return;
    }
    setErro(null);
    setPending(true);
    try {
      const user = await atualizarMe({ email: value });
      onSaved(user.email);
      setEmail(user.email);
      setOk(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar o e-mail.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="field">
        <Label htmlFor="email">E-mail institucional</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          aria-invalid={erro ? true : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            setErro(null);
            setOk(false);
          }}
        />
      </div>
      {erro ? <p className="error-text">{erro}</p> : null}
      {ok ? (
        <Alert variant="success" role="status">
          <AlertDescription className="text-inherit">E-mail atualizado.</AlertDescription>
        </Alert>
      ) : null}
      <div className="actions">
        <Button type="submit" disabled={pending}>
          Salvar e-mail
        </Button>
      </div>
    </form>
  );
}

function SenhaForm() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setOk(false);
    if (nova.length < 8) {
      setErro("A nova senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (nova !== confirma) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setErro(null);
    setPending(true);
    try {
      await alterarSenha({ senhaAtual: atual, senhaNova: nova });
      setAtual("");
      setNova("");
      setConfirma("");
      setOk(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="field">
        <Label htmlFor="senha-atual">Senha atual</Label>
        <Input
          id="senha-atual"
          type="password"
          autoComplete="current-password"
          value={atual}
          onChange={(event) => setAtual(event.target.value)}
        />
      </div>
      <div className="row-2">
        <div className="field">
          <Label htmlFor="senha-nova">Nova senha</Label>
          <Input
            id="senha-nova"
            type="password"
            autoComplete="new-password"
            value={nova}
            onChange={(event) => setNova(event.target.value)}
          />
        </div>
        <div className="field">
          <Label htmlFor="senha-confirma">Confirmar nova senha</Label>
          <Input
            id="senha-confirma"
            type="password"
            autoComplete="new-password"
            value={confirma}
            onChange={(event) => setConfirma(event.target.value)}
          />
        </div>
      </div>
      {erro ? <p className="error-text">{erro}</p> : null}
      {ok ? (
        <Alert variant="success" role="status">
          <AlertDescription className="text-inherit">Senha atualizada.</AlertDescription>
        </Alert>
      ) : null}
      <div className="actions">
        <Button type="submit" disabled={pending}>
          Salvar senha
        </Button>
      </div>
    </form>
  );
}
