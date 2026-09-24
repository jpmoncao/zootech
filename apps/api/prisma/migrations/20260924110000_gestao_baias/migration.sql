CREATE TYPE "SetorBaia" AS ENUM ('canil', 'gatil', 'quarentena');
CREATE TYPE "TipoBaia" AS ENUM ('coletiva', 'individual');
CREATE TYPE "EstadoBaia" AS ENUM ('ativa', 'inativa', 'interditada', 'em_higienizacao');

CREATE TABLE "baias" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "codigoNormalizado" TEXT NOT NULL,
  "setor" "SetorBaia" NOT NULL,
  "tipo" "TipoBaia" NOT NULL,
  "capacidade" INTEGER NOT NULL,
  "areaM2" DECIMAL(8,2),
  "possuiSolario" BOOLEAN NOT NULL DEFAULT false,
  "exclusivaIsolamento" BOOLEAN NOT NULL DEFAULT false,
  "estado" "EstadoBaia" NOT NULL DEFAULT 'ativa',
  "ultimaHigienizacaoEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "baias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "baias_capacidade_check" CHECK ("capacidade" >= 1),
  CONSTRAINT "baias_tipo_capacidade_check" CHECK ("tipo" <> 'individual' OR "capacidade" = 1)
);
CREATE UNIQUE INDEX "baias_codigoNormalizado_key" ON "baias"("codigoNormalizado");
CREATE INDEX "baias_setor_estado_idx" ON "baias"("setor", "estado");

CREATE INDEX "auditoria_eventos_baia_idx" ON "auditoria_eventos" (("dados"->>'entidade'), ("dados"->>'entidadeId'), "createdAt" DESC);
