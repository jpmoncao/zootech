UPDATE "fotos_animais"
SET "caminhoAbsoluto" = regexp_replace("caminhoAbsoluto", '^.*[/\\]storage[/\\]media[/\\]', '')
WHERE "caminhoAbsoluto" LIKE '%/storage/media/%'
   OR "caminhoAbsoluto" LIKE '%\storage\media\%';
