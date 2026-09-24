"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ApiError, criarSolicitacao, login } from "../lib/api";
import { Mark } from "./mark";
import { maskIdentifier, readPosto, writePosto } from "../lib/session";

type Mode = "enter" | "request";
type Step = 1 | 2 | 3 | "done";
type Role = "veterinario" | "agente" | "recepcao" | "coordenacao";

const roles: { id: Role; label: string; note: string }[] = [
  { id: "veterinario", label: "Médico(a)-veterinário(a)", note: "Exige CRMV" },
  { id: "agente", label: "Agente de zoonoses", note: "Manejo e recolhimento" },
  { id: "recepcao", label: "Recepção", note: "Balcão de atendimento" },
  { id: "coordenacao", label: "Coordenação", note: "Acessos e indicadores" },
];

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("enter");
  return (
    <main className="login">
      <section className="login-art" aria-label="ZooTech">
        <div className="brand">
          <Mark size={36} />
          <span>
            <b>ZooTech</b>
            <small>Centro de Controle de Zoonoses</small>
          </span>
        </div>
        <div className="login-copy">
          <h1>Cuidar dos animais é cuidar da cidade.</h1>
          <p>
            Gestão do plantel, das baias e da vacinação para quem trabalha no
            Centro de Controle de Zoonoses.
          </p>
        </div>
        <p className="login-foot">Acesso restrito a servidores</p>
      </section>
      {mode === "enter" ? (
        <EnterForm onRequest={() => setMode("request")} />
      ) : (
        <RequestAccess onBack={() => setMode("enter")} />
      )}
    </main>
  );
}

function EnterForm({ onRequest }: { onRequest: () => void }) {
  const router = useRouter();
  const idError = useId();
  const passError = useId();
  const formError = useId();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [persist, setPersist] = useState(false);
  const [idMessage, setIdMessage] = useState<string | null>(null);
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const masked = maskIdentifier(identifier);
    const passMissing = password.trim().length === 0;
    setIdMessage(masked.ok ? null : masked.message);
    setPassMessage(passMissing ? "Informe a senha." : null);
    setFormMessage(null);
    if (!masked.ok || passMissing) return;

    setPending(true);
    try {
      await login({
        identificador: masked.identifier,
        senha: password,
        manterConectado: persist,
      });
      writePosto(readPosto());
      router.push("/painel");
    } catch (error) {
      setFormMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível falar com o servidor.",
      );
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      <div>
        <h2>Entrar</h2>
        <p className="hint">Use seu CPF ou matrícula de servidor.</p>
      </div>
      <div className="field">
        <Label htmlFor="identifier">CPF ou matrícula</Label>
        <Input
          id="identifier"
          className="mono"
          name="username"
          autoComplete="username"
          inputMode="numeric"
          value={identifier}
          aria-invalid={idMessage ? true : undefined}
          aria-describedby={idMessage ? idError : undefined}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setIdMessage(null);
          }}
        />
        {idMessage ? (
          <p className="error-text" id={idError}>
            {idMessage}
          </p>
        ) : null}
      </div>
      <div className="field">
        <div className="label-row">
          <Label htmlFor="password">Senha</Label>
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2 text-[13px]"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </Button>
        </div>
        <Input
          id="password"
          name="password"
          autoComplete="current-password"
          type={showPassword ? "text" : "password"}
          value={password}
          aria-invalid={passMessage ? true : undefined}
          aria-describedby={passMessage ? passError : undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setPassMessage(null);
          }}
        />
        {passMessage ? (
          <p className="error-text" id={passError}>
            {passMessage}
          </p>
        ) : null}
      </div>
      <div className="check">
        <Checkbox
          id="persist"
          checked={persist}
          onCheckedChange={(value) => setPersist(value === true)}
        />
        <Label htmlFor="persist">Manter conectado neste computador</Label>
      </div>
      {formMessage ? (
        <p className="error-text" id={formError} role="alert">
          {formMessage}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <div className="divider">
        <Separator />
        <span>primeiro acesso</span>
        <Separator />
      </div>
      <Button className="w-full" variant="outline" type="button" onClick={onRequest}>
        Solicitar acesso
      </Button>
    </form>
  );
}

function RequestAccess({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [crmv, setCrmv] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function nextFromIdentity(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 5) {
      setError("Informe o nome completo.");
      return;
    }
    const cpfMask = maskIdentifier(cpf);
    if (!cpfMask.ok || cpfMask.identifier.length !== 11) {
      setError("Informe um CPF com 11 dígitos.");
      return;
    }
    const matriculaMask = maskIdentifier(matricula);
    if (!matriculaMask.ok || matriculaMask.identifier.length === 11) {
      setError("Informe a matrícula, separada do CPF.");
      return;
    }
    if (!email.includes("@") || !email.trim().endsWith(".gov.br")) {
      setError("Use o e-mail institucional, terminado em .gov.br.");
      return;
    }
    setError(null);
    setStep(2);
  }

  function nextFromRole(event: FormEvent) {
    event.preventDefault();
    if (!role) {
      setError("Escolha a função no CCZ.");
      return;
    }
    if (role === "veterinario" && crmv.replace(/\D/g, "").length < 4) {
      setError("Informe o CRMV para a função de veterinário.");
      return;
    }
    setError(null);
    setStep(3);
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("A confirmação não é igual à senha.");
      return;
    }
    if (!role) {
      setError("Escolha a função no CCZ.");
      return;
    }

    const cpfMask = maskIdentifier(cpf);
    const matriculaMask = maskIdentifier(matricula);
    if (!cpfMask.ok || !matriculaMask.ok) {
      setError("Revise CPF e matrícula.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      await criarSolicitacao({
        nome: name.trim(),
        cpf: cpfMask.identifier,
        matricula: matriculaMask.identifier,
        email: email.trim(),
        funcaoPretendida: role,
        ...(role === "veterinario" ? { crmv: crmv.replace(/\D/g, "") } : {}),
        senha: password,
      });
      setStep("done");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível falar com o servidor.",
      );
      setPending(false);
    }
  }

  return (
    <div className="login-form">
      <ol className="steps">
        <li aria-current={step === 1 ? "step" : undefined}>Seus dados</li>
        <li aria-current={step === 2 ? "step" : undefined}>Função</li>
        <li aria-current={step === 3 || step === "done" ? "step" : undefined}>Senha</li>
      </ol>
      {step === "done" ? (
        <>
          <h2>Pedido enviado</h2>
          <Alert variant="info">
            <AlertDescription className="text-inherit">
              A coordenação do CCZ vai analisar este pedido. Esta tela não entra
              no painel.
            </AlertDescription>
          </Alert>
          <Button type="button" onClick={onBack}>
            Voltar para entrar
          </Button>
        </>
      ) : null}
      {step === 1 ? (
        <form onSubmit={nextFromIdentity} noValidate>
          <h2>Solicitar acesso</h2>
          <div className="row-2" style={{ marginTop: 16 }}>
            <div className="field">
              <Label htmlFor="nome">
                Nome completo <i className="req">*</i>
              </Label>
              <Input id="nome" value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="cpf">
                CPF <i className="req">*</i>
              </Label>
              <Input id="cpf" className="mono" inputMode="numeric" value={cpf} onChange={(event) => setCpf(event.target.value)} />
            </div>
          </div>
          <div className="row-2" style={{ marginTop: 12 }}>
            <div className="field">
              <Label htmlFor="matricula">
                Matrícula <i className="req">*</i>
              </Label>
              <Input id="matricula" className="mono" value={matricula} onChange={(event) => setMatricula(event.target.value)} />
            </div>
            <div className="field">
              <Label htmlFor="email">
                E-mail institucional <i className="req">*</i>
              </Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="actions" style={{ marginTop: 16 }}>
            <Button variant="outline" type="button" onClick={onBack}>
              Voltar
            </Button>
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      ) : null}
      {step === 2 ? (
        <form onSubmit={nextFromRole}>
          <h2>Qual é a sua função?</h2>
          <RadioGroup
            className="choice-grid"
            style={{ marginTop: 16 }}
            value={role ?? ""}
            onValueChange={(value) => setRole(value as Role)}
            aria-label="Função no CCZ"
          >
            {roles.map((item) => (
              <Label
                key={item.id}
                htmlFor={`role-${item.id}`}
                className="choice"
                data-checked={role === item.id ? "true" : undefined}
              >
                <RadioGroupItem id={`role-${item.id}`} value={item.id} className="sr-only" />
                <span>
                  {item.label}
                  <small>{item.note}</small>
                </span>
              </Label>
            ))}
          </RadioGroup>
          {role === "veterinario" ? (
            <div className="field" style={{ marginTop: 12 }}>
              <Label htmlFor="crmv">
                CRMV <i className="req">*</i>
              </Label>
              <Input id="crmv" className="mono" value={crmv} onChange={(event) => setCrmv(event.target.value)} />
            </div>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
          <div className="actions" style={{ marginTop: 16 }}>
            <Button variant="outline" type="button" onClick={() => { setError(null); setStep(1); }}>
              Voltar
            </Button>
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      ) : null}
      {step === 3 ? (
        <form onSubmit={finish}>
          <h2>Crie uma senha</h2>
          <div className="field" style={{ marginTop: 16 }}>
            <Label htmlFor="nova-senha">Senha</Label>
            <Input id="nova-senha" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <Label htmlFor="confirma-senha">Confirmar senha</Label>
            <Input id="confirma-senha" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="actions" style={{ marginTop: 16 }}>
            <Button variant="outline" type="button" onClick={() => { setError(null); setStep(2); }}>
              Voltar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando…" : "Enviar pedido"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
