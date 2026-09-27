ALTER TABLE "tutores" ADD COLUMN "tipoDocumento" TEXT NOT NULL DEFAULT 'RG';
ALTER TABLE "tutores" ADD COLUMN "numeroDocumento" TEXT NOT NULL DEFAULT '';
CREATE INDEX "tutores_numeroDocumento_idx" ON "tutores"("numeroDocumento");

ALTER TABLE "tutores" ALTER COLUMN "tipoDocumento" DROP DEFAULT;
ALTER TABLE "tutores" ALTER COLUMN "numeroDocumento" DROP DEFAULT;
