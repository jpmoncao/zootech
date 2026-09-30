CREATE TYPE "TipoCastracaoAnimal" AS ENUM ('avaliacao', 'procedimento');
CREATE TYPE "EstadoCastracaoAnimal" AS ENUM ('nao_castrado', 'agendada', 'realizada', 'cancelada');
CREATE TYPE "OrigemCastracaoAnimal" AS ENUM ('fluxo', 'legada');

CREATE TABLE "castracoes_animais" (
  "id" SERIAL NOT NULL,
  "animalId" INTEGER NOT NULL,
  "tipo" "TipoCastracaoAnimal" NOT NULL,
  "estado" "EstadoCastracaoAnimal" NOT NULL,
  "origem" "OrigemCastracaoAnimal" NOT NULL DEFAULT 'fluxo',
  "dataHoraPlanejada" TIMESTAMP(3),
  "dataEfetiva" TIMESTAMP(3),
  "dataEfetivaTemHora" BOOLEAN NOT NULL DEFAULT false,
  "dataAvaliacao" TIMESTAMP(3),
  "observacao" TEXT,
  "motivoCancelamento" TEXT,
  "usuarioId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "castracoes_animais_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "castracoes_animais_tipo_estado_check" CHECK (
    ("tipo" = 'avaliacao' AND "estado" = 'nao_castrado')
    OR ("tipo" = 'procedimento' AND "estado" IN ('agendada', 'realizada', 'cancelada'))
  ),
  CONSTRAINT "castracoes_animais_agendada_check" CHECK (
    "estado" <> 'agendada'
    OR ("dataHoraPlanejada" IS NOT NULL AND "dataEfetiva" IS NULL AND "motivoCancelamento" IS NULL)
  ),
  CONSTRAINT "castracoes_animais_cancelada_check" CHECK (
    "estado" <> 'cancelada'
    OR ("motivoCancelamento" IS NOT NULL AND length(btrim("motivoCancelamento")) > 0)
  ),
  CONSTRAINT "castracoes_animais_avaliacao_check" CHECK (
    "tipo" <> 'avaliacao'
    OR ("dataHoraPlanejada" IS NULL AND "dataEfetiva" IS NULL AND "motivoCancelamento" IS NULL)
  ),
  CONSTRAINT "castracoes_animais_data_efetiva_hora_check" CHECK (
    "dataEfetivaTemHora" = false OR "dataEfetiva" IS NOT NULL
  )
);

INSERT INTO "castracoes_animais" (
  "animalId",
  "tipo",
  "estado",
  "origem",
  "observacao",
  "usuarioId",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  'procedimento'::"TipoCastracaoAnimal",
  'realizada'::"EstadoCastracaoAnimal",
  'legada'::"OrigemCastracaoAnimal",
  'Migrado do status legado: castrado.',
  "criadoPorId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "animais"
WHERE "castrado" = 'sim';

INSERT INTO "castracoes_animais" (
  "animalId",
  "tipo",
  "estado",
  "origem",
  "observacao",
  "usuarioId",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  'avaliacao'::"TipoCastracaoAnimal",
  'nao_castrado'::"EstadoCastracaoAnimal",
  'legada'::"OrigemCastracaoAnimal",
  'Migrado do status legado: não castrado.',
  "criadoPorId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "animais"
WHERE "castrado" = 'nao';

CREATE INDEX "castracoes_animais_animalId_createdAt_idx" ON "castracoes_animais"("animalId", "createdAt");
CREATE INDEX "castracoes_animais_estado_dataHoraPlanejada_idx" ON "castracoes_animais"("estado", "dataHoraPlanejada");
CREATE INDEX "castracoes_animais_usuarioId_idx" ON "castracoes_animais"("usuarioId");
CREATE UNIQUE INDEX "castracoes_animais_agendamento_ativo_unico_idx"
  ON "castracoes_animais"("animalId")
  WHERE "tipo" = 'procedimento' AND "estado" = 'agendada';
CREATE UNIQUE INDEX "castracoes_animais_procedimento_realizado_unico_idx"
  ON "castracoes_animais"("animalId")
  WHERE "tipo" = 'procedimento' AND "estado" = 'realizada';

ALTER TABLE "castracoes_animais" ADD CONSTRAINT "castracoes_animais_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "castracoes_animais" ADD CONSTRAINT "castracoes_animais_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "animais" DROP COLUMN "castrado";
DROP TYPE "StatusCastracaoAnimal";
