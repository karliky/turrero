# Seguridad

## Secretos

Las únicas credenciales del proyecto son `X_API_BEARER_TOKEN` y `OPENAI_API_KEY` (ver `.env.example`). Van en `.env.local`, que git ignora, y sólo las usan los comandos `turra:*`: la web publicada no necesita ninguna.

## Contenido de X

Las turras se obtienen exclusivamente con la API oficial de X. Los términos de X exigen mantener actualizado el contenido almacenado y retirar el que se borre: `npm run turra:sync -- <id> --delete-missing` refresca una turra y la elimina si ya no existe en X.

## Reportar un problema

Abre un issue en https://github.com/karliky/turrero/issues o contacta con el mantenedor por X.
