
Contexto (o que está acontecendo)
- Você consegue anexar, mas ao clicar para abrir o anexo aparece “Bucket not found (404)”.
- Isso acontece porque o código está salvando/abrindo o link como “URL pública” (endpoint `/object/public/...`), porém o bucket `chat-attachments` está configurado como privado. Em buckets privados, abrir pelo endpoint público retorna “Bucket not found” por segurança, mesmo que o arquivo exista.

Objetivo
- Manter o bucket privado (mais seguro).
- Permitir que usuários autenticados (com as permissões atuais) consigam abrir anexos do chat normalmente.
- Garantir que anexos antigos continuem funcionando (mesmo os que já foram salvos com `file_url` público).
- Evitar “links que expiram”: em vez de salvar URL assinada no banco (que expira), salvar o “caminho do arquivo” e gerar uma URL assinada na hora de abrir.

O que vamos mudar (visão geral)
1) Banco de dados
- Adicionar uma coluna nova em `service_call_message_attachments`:
  - `file_path TEXT NULL` (vai armazenar o caminho dentro do bucket, ex: `SERVICE_CALL_ID/123-nome.png`)
- Fazer backfill dos registros antigos:
  - Para anexos já existentes, extrair o `file_path` a partir do `file_url` (que hoje aponta para `/object/public/chat-attachments/<path>`).
- Não vamos remover `file_url` para manter compatibilidade, mas a UI vai priorizar `file_path`.

2) Frontend – envio (ChatInput)
- Em `src/components/service-calls/ChatInput.tsx`:
  - Parar de usar `getPublicUrl()` para montar `file_url`.
  - Após upload, salvar no estado do anexo algo como:
    - `file_path: <filePath>`
    - manter `file_url` apenas como fallback (opcional) ou salvar vazio.
  - Ajustar o payload enviado no `onSend` para incluir `file_path` (além dos metadados já existentes).

3) Frontend – gravação no banco (useCreateMessage)
- Em `src/hooks/useServiceCallMessages.ts`:
  - Atualizar o tipo `MessageAttachment` e o input de anexos para aceitar `file_path?: string | null`.
  - No insert em `service_call_message_attachments`, salvar `file_path` (e manter `file_url` como compatibilidade, se ainda existir no payload).

4) Frontend – abrir anexo (ChatMessage)
- Em `src/components/service-calls/ChatMessage.tsx`:
  - Trocar o `<a href={att.file_url}>` por um botão/ação de clique.
  - Ao clicar:
    - Determinar o `path` do arquivo:
      - Preferir `att.file_path`.
      - Se não existir, tentar extrair do `att.file_url` (para anexos antigos).
    - Gerar uma URL assinada on-demand:
      - `supabase.storage.from('chat-attachments').createSignedUrl(path, <tempo_em_segundos>)`
    - Abrir a URL assinada em nova aba.
  - Se falhar, mostrar toast amigável (“Não foi possível abrir o anexo. Tente novamente.”) e logar o erro no console.

Detalhes técnicos (passo a passo)

Passo 1 — Migração no banco
- Criar migration SQL para:
  1. `ALTER TABLE public.service_call_message_attachments ADD COLUMN IF NOT EXISTS file_path TEXT;`
  2. Backfill (somente onde `file_path` estiver nulo):
     - Extrair o trecho após `.../object/public/chat-attachments/`
     - Exemplo de lógica (ajustada no SQL final):
       - `file_path = regexp_replace(file_url, '^.*/object/public/chat-attachments/', '')`
     - Filtrar apenas URLs que contenham `/object/public/chat-attachments/`.
- Observação: essa migração não altera RLS nem torna o bucket público.

Passo 2 — Ajustar tipagens e payload de anexos
- Atualizar as interfaces/types em `useServiceCallMessages.ts`:
  - `MessageAttachment` incluir `file_path?: string | null`
  - `CreateMessageInput.attachments[]` incluir `file_path?: string | null`

Passo 3 — Ajustar upload no ChatInput
- `ChatInput.tsx` já sanitiza nome (bom).
- Alterar o trecho que hoje faz:
  - `getPublicUrl(filePath)`
- Para:
  - Salvar `file_path: filePath` no array `attachments` do estado.
  - (Opcional) manter `file_url` como string vazia ou manter o antigo comportamento apenas como fallback — mas a UI não dependerá mais disso.

Passo 4 — Ajustar insert de anexos no useCreateMessage
- Ao inserir em `service_call_message_attachments`:
  - inserir também `file_path`.
- Garantir que continue passando nos checks/constraints (não há constraint de `file_path`, então ok).

Passo 5 — Ajustar abertura no ChatMessage (ponto principal do bug)
- Implementar uma função utilitária local, por exemplo `openAttachment(att)`:
  - resolve `path`
  - chama `createSignedUrl`
  - `window.open(signedUrl, "_blank", "noopener,noreferrer")`
- Render:
  - manter o layout visual como link, mas tecnicamente ser `<button>` (ou `<a>` sem `href`, com `onClick`) para evitar navegação para o URL público quebrado.

Critérios de aceite (o que você vai validar)
- Dentro de uma OS, na aba Chat:
  - Anexar uma foto com nome normal e com nome com acentos/espaços.
  - Enviar a mensagem.
  - Clicar no anexo e abrir em nova aba sem erro.
- Mensagens antigas (já enviadas antes dessa correção):
  - Clicar no anexo e abrir normalmente (via extração de `file_path` do `file_url` + URL assinada).

Riscos / observações
- URLs assinadas expiram, por isso não vamos armazenar URL assinada no banco; vamos gerar na hora de abrir.
- Se houver anexos antigos cujo `file_url` não siga o padrão esperado, a abertura pode falhar; nesses casos, vamos mostrar um erro amigável e o registro pode precisar ser corrigido manualmente (raro).

Arquivos envolvidos
- Backend (migration):
  - `supabase/migrations/<nova_migration>.sql`
- Frontend:
  - `src/components/service-calls/ChatInput.tsx`
  - `src/components/service-calls/ChatMessage.tsx`
  - `src/hooks/useServiceCallMessages.ts`

Próximo passo após sua aprovação
- Eu implemento a migration + ajustes no ChatInput/ChatMessage/useServiceCallMessages e você testa abrindo um anexo novo e um antigo no chat.