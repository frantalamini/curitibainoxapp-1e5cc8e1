
## Plano de Correção Completo - Chamados Técnicos

### Problemas Identificados

| # | Problema | Causa Raiz |
|---|----------|------------|
| 1 | "Erro ao gerar PDF" ao voltar | `autoLink.click()` navega para blob URL, abortando requisições e causando exceções |
| 2 | Botões WhatsApp/E-mail não aparecem | Estado `generatedPdfUrl` é perdido na navegação; condição do `useEffect` muito restritiva |
| 3 | Submenus de Status não aparecem | Condições de permissão retornam `false` enquanto hooks carregam |

---

### Solução Detalhada

#### Correção 1: Remover navegação automática do PDF

**Arquivo:** `src/pages/ServiceCallForm.tsx`

**Ação:** Remover completamente os blocos `autoLink.click()` nos 3 lugares (técnico, admin técnico, admin completo).

**Antes (linhas 1977-1984):**
```typescript
const autoLink = document.createElement('a');
autoLink.href = blobUrl;
autoLink.download = fileName;
autoLink.style.display = 'none';
document.body.appendChild(autoLink);
autoLink.click();
document.body.removeChild(autoLink);
setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
```

**Depois:**
```typescript
// Armazenar blob para download posterior sob controle do usuário
setPdfBlobUrl(blobUrl);
setPdfBlob(blob);
```

Isso mantém o PDF disponível para ações manuais sem navegar automaticamente.

---

#### Correção 2: Adicionar estados e UI para ações do PDF

**Arquivo:** `src/pages/ServiceCallForm.tsx`

**Novos estados (após linha ~130):**
```typescript
const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
```

**Cleanup no useEffect existente:**
```typescript
useEffect(() => {
  return () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
  };
}, [pdfBlobUrl]);
```

**Nova UI após geração do PDF (substitui o bloco atual de botões WhatsApp/Email):**
```typescript
{(generatedPdfUrl || pdfBlobUrl) && existingCall && (
  <div className="flex flex-wrap gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
    <span className="w-full text-sm font-medium text-green-700 dark:text-green-300 mb-1">
      ✓ PDF gerado com sucesso
    </span>
    
    {/* Abrir PDF */}
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        const url = pdfBlobUrl || generatedPdfUrl;
        if (url) window.open(url, '_blank');
      }}
    >
      <Eye className="mr-2 h-4 w-4" />
      Visualizar PDF
    </Button>
    
    {/* Salvar PDF (download) */}
    {pdfBlob && (
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const link = document.createElement('a');
          link.href = pdfBlobUrl!;
          link.download = `OS-${existingCall.os_number}.pdf`;
          link.click();
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        Salvar PDF
      </Button>
    )}
    
    {/* WhatsApp */}
    <Button
      type="button"
      onClick={() => setSendWhatsAppModalOpen(true)}
      className="bg-green-600 hover:bg-green-700"
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      Enviar via WhatsApp
    </Button>
    
    {/* E-mail */}
    <Button
      type="button"
      onClick={() => setSendEmailModalOpen(true)}
      className="bg-blue-600 hover:bg-blue-700"
    >
      <Mail className="mr-2 h-4 w-4" />
      Enviar por E-mail
    </Button>
  </div>
)}
```

---

#### Correção 3: Melhorar useEffect que popula generatedPdfUrl

**Arquivo:** `src/pages/ServiceCallForm.tsx` (linhas 446-451)

**Antes:**
```typescript
if ((existingCall as any).report_pdf_path && (existingCall as any).report_access_token) {
  const pdfUrl = `...`;
  setGeneratedPdfUrl(pdfUrl);
}
```

**Depois:**
```typescript
// Priorizar report_access_token - se existir, podemos montar a URL pública
// mesmo sem report_pdf_path (que pode ter falhado silenciosamente)
if ((existingCall as any).report_access_token) {
  const pdfUrl = `https://curitibainoxapp.com/relatorio-os/${existingCall.os_number}/${(existingCall as any).report_access_token}`;
  setGeneratedPdfUrl(pdfUrl);
}
```

---

#### Correção 4: Garantir que submenus de status apareçam

**Arquivo:** `src/components/service-calls/ServiceCallActionsMenu.tsx`

**Problema:** Os hooks `useUserRole` e `useCurrentUserPermissions` podem estar em estado de loading, fazendo as permissões retornarem `false`.

**Solução:** Adicionar verificação de loading e considerar como "sem permissão" apenas se carregou E não tem permissão.

**Antes (linhas 61-69):**
```typescript
const { isAdmin, isTechnician } = useUserRole();
const { data: permissionsData } = useCurrentUserPermissions();
const profileType = permissionsData?.profileType;
const isGerencial = profileType === "gerencial";
const isAdm = profileType === "adm";

const canEditTechnicalStatus = isAdmin || isTechnician || isGerencial || isAdm;
const canEditCommercialStatus = isAdmin || isGerencial || isAdm;
```

**Depois:**
```typescript
const { isAdmin, isTechnician, loading: roleLoading } = useUserRole();
const { data: permissionsData, isLoading: permissionsLoading } = useCurrentUserPermissions();
const profileType = permissionsData?.profileType;
const isGerencial = profileType === "gerencial";
const isAdm = profileType === "adm";

// Enquanto carrega, considerar que PODE ter permissão (evita flickering)
// Após carregar, usar a lógica real
const isLoadingPermissions = roleLoading || permissionsLoading;

const canEditTechnicalStatus = isLoadingPermissions || isAdmin || isTechnician || isGerencial || isAdm;
const canEditCommercialStatus = isLoadingPermissions || isAdmin || isGerencial || isAdm;
```

**Nota:** Isso faz os submenus aparecerem enquanto carrega. Se o usuário não tiver permissão, ao tentar alterar o status, a RLS do banco irá bloquear.

---

### Arquivos Modificados

| Arquivo | Alterações |
|---------|------------|
| `src/pages/ServiceCallForm.tsx` | Remover autoLink.click() em 3 lugares; adicionar estados pdfBlob/pdfBlobUrl; nova UI de ações do PDF; ajustar useEffect do generatedPdfUrl |
| `src/components/service-calls/ServiceCallActionsMenu.tsx` | Adicionar verificação de loading nos hooks; ajustar lógica de permissões |

---

### Impacto Esperado

1. **Erro ao voltar** - Eliminado (não há mais navegação automática)
2. **Botões WhatsApp/E-mail** - Aparecem imediatamente após gerar PDF e persistem ao reabrir a OS
3. **Submenus de Status** - Aparecem corretamente, sem depender do timing de carregamento dos hooks
4. **Experiência do usuário** - PDF fica disponível para visualizar/salvar/enviar sem perder o contexto da OS

---

### Sem Alterações Em

- Rotas do app (`App.tsx`)
- Página pública do relatório (`/relatorio-os`)
- Backend/Edge Functions
- Estrutura do banco de dados
- Demais módulos do sistema
