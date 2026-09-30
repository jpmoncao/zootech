-- CreateEnum
CREATE TYPE "GravidadeReacaoAdversa" AS ENUM ('leve', 'moderada', 'grave');

-- CreateEnum
CREATE TYPE "DesfechoReacaoAdversa" AS ENUM ('em_acompanhamento', 'resolvida', 'resolvida_com_sequela', 'obito');

-- AlterEnum
ALTER TYPE "SituacaoAnimal" ADD VALUE 'em_observacao_antirrabica';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoEventoAnimal" ADD VALUE 'reacao_adversa';
ALTER TYPE "TipoEventoAnimal" ADD VALUE 'encerramento_observacao_antirrabica';

-- AlterTable
ALTER TABLE "animais" ADD COLUMN     "observacaoAntirrabicaInicioEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "eventos_animais" ADD COLUMN     "aplicacaoVacinaId" INTEGER,
ADD COLUMN     "desfechoReacao" "DesfechoReacaoAdversa",
ADD COLUMN     "eventoOrigemId" INTEGER,
ADD COLUMN     "gravidadeReacao" "GravidadeReacaoAdversa";

-- CreateIndex
CREATE INDEX "animais_situacao_observacaoAntirrabicaInicioEm_idx" ON "animais"("situacao", "observacaoAntirrabicaInicioEm");

-- CreateIndex
CREATE INDEX "eventos_animais_tipo_aplicacaoVacinaId_idx" ON "eventos_animais"("tipo", "aplicacaoVacinaId");

-- CreateIndex
CREATE INDEX "eventos_animais_eventoOrigemId_idx" ON "eventos_animais"("eventoOrigemId");

-- AddForeignKey
ALTER TABLE "eventos_animais" ADD CONSTRAINT "eventos_animais_aplicacaoVacinaId_fkey" FOREIGN KEY ("aplicacaoVacinaId") REFERENCES "aplicacoes_vacinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_animais" ADD CONSTRAINT "eventos_animais_eventoOrigemId_fkey" FOREIGN KEY ("eventoOrigemId") REFERENCES "eventos_animais"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Gravidade e desfecho existem juntos ou nenhum dos dois. Não referencia 'reacao_adversa' porque
-- um valor de enum acrescentado nesta migration não pode ser usado antes do commit.
ALTER TABLE "eventos_animais" ADD CONSTRAINT "eventos_animais_reacao_check" CHECK (("gravidadeReacao" IS NULL) = ("desfechoReacao" IS NULL));
