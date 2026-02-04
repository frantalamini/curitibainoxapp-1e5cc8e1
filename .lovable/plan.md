# Plano de Correção - Chamados Técnicos

## ✅ Correções Aplicadas

### 1. PDF não navega mais automaticamente
- Removido `autoLink.click()` dos 3 blocos de geração (técnico, admin técnico, admin completo)
- Adicionados estados `pdfBlob` e `pdfBlobUrl` para armazenar o PDF gerado

### 2. Nova UI de ações do PDF
- Card verde com "✓ PDF gerado com sucesso" aparece após gerar
- Botões: Visualizar PDF, Salvar PDF, Enviar via WhatsApp, Enviar por E-mail
- Condição melhorada: `(generatedPdfUrl || pdfBlobUrl)` garante que apareça

### 3. Persistência do link de relatório
- useEffect agora detecta `report_access_token` mesmo sem `report_pdf_path`
- Botões de envio aparecem ao reabrir uma OS que já tem relatório

### 4. Submenus de status aparecem corretamente
- Adicionada verificação de loading nos hooks de permissão
- `canEditTechnicalStatus` e `canEditCommercialStatus` incluem `isLoadingPermissions`
- Menus aparecem enquanto permissões carregam; RLS bloqueia se não autorizado

## Arquivos Modificados
- `src/pages/ServiceCallForm.tsx`
- `src/components/service-calls/ServiceCallActionsMenu.tsx`
