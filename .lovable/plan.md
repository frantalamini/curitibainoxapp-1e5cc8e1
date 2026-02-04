
## Plano de Correção: Erro ao Voltar do PDF + Modal WhatsApp Não Abre

### Problemas Identificados

**Problema 1: "Erro ao gerar PDF" ao Voltar**
O toast de erro aparece porque, durante a geração do PDF, se ocorrer qualquer exceção (ou o processo for abortado ao navegar), o `catch` dispara o toast ANTES de verificar `isMountedRef.current`. O check está correto para os blocos que já foram corrigidos, mas a geração do PDF em si (`generateOSPdf`) pode falhar internamente e lançar exceção que não é relacionada à navegação.

Causa-raiz: A função `generateOSPdf` depende de fetch de imagens/assinaturas que podem timeout ou falhar. Quando você volta rapidamente, essas requisições são abortadas e lançam exceção, que cai no catch mostrando o toast.

**Problema 2: Modal WhatsApp Não Abre**
O modal de envio via WhatsApp só aparece se `generatedPdfUrl` estiver preenchido. Após gerar o PDF, o código define:
```typescript
setGeneratedPdfUrl(uploadResult.signedUrl);  // URL assinada do Storage
```

Porém, na verificação para exibir botões de envio, espera-se que `generatedPdfUrl` seja uma URL pública válida. O problema é que ao gerar o PDF com sucesso, a URL está sendo salva corretamente, MAS existe uma condição de corrida onde:
1. PDF é gerado com sucesso
2. `setGeneratedPdfUrl(uploadResult.signedUrl)` é chamado
3. Navegação acontece antes do React atualizar o estado
4. Ao voltar, `generatedPdfUrl` está `null`

Além disso, verificando o código, a lógica no `useEffect` (linhas 444-451) está verificando `report_pdf_path` E `report_access_token` do banco. Se o upload falhar em salvar esses campos (erro silencioso), o modal nunca aparecerá.

### Solução

#### Correção 1: Melhorar tratamento de erros na geração de PDF

Adicionar verificação mais granular para distinguir erros de "navegação/abort" de erros reais:

```text
ANTES (linha 2004-2012):
} catch (error) {
  console.error("Error generating PDF:", error);
  if (isMountedRef.current) {
    toast({ title: "Erro ao gerar PDF", ... });
  }
}

DEPOIS:
} catch (error: any) {
  console.error("Error generating PDF:", error);
  // Só mostrar erro se componente ainda estiver montado
  // E não for erro de abort (navegação)
  const isAbortError = error?.name === 'AbortError' || 
                       error?.message?.includes('abort') ||
                       error?.message?.includes('cancel');
  if (isMountedRef.current && !isAbortError) {
    toast({ title: "Erro ao gerar PDF", ... });
  }
}
```

Aplicar essa correção em TODOS os 3 blocos de geração de PDF em ServiceCallForm.tsx (linhas 2004-2013, 2064-2071, 2123-2130).

#### Correção 2: Garantir que generatedPdfUrl seja definido com URL pública após upload

Após o upload bem-sucedido, definir a URL pública correta (não a signedUrl do storage):

```text
ANTES:
setGeneratedPdfUrl(uploadResult.signedUrl);

DEPOIS:
// Usar URL pública para o modal de envio
const publicUrl = `https://curitibainoxapp.com/relatorio-os/${existingCall.os_number}/${uploadResult.newAccessToken}`;
setGeneratedPdfUrl(publicUrl);
```

Aplicar em TODOS os 3 blocos de geração (linhas 1988, 2048, 2102).

#### Correção 3: Refetch após upload para garantir sincronização

Após gerar o PDF, forçar um refetch do chamado para garantir que os campos `report_access_token` e `report_pdf_path` estejam sincronizados com o banco:

```text
// Após toast de sucesso
await refetchCall();
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| src/pages/ServiceCallForm.tsx | 3x correção de tratamento de erro de abort + 3x correção de URL pública + 3x refetch |

### Impacto

- Erro ao voltar desaparecerá (aborts não serão mais reportados como erro)
- Modal de WhatsApp abrirá corretamente após gerar PDF
- URL correta será enviada no WhatsApp (pública, não signedUrl)
- Dados sincronizados após geração do PDF

### Localizações Exatas das Alterações

1. **Técnico PDF** (linhas 1971-2018): Corrigir catch + setGeneratedPdfUrl + adicionar refetch
2. **Admin PDF Técnico** (linhas 2030-2077): Corrigir catch + setGeneratedPdfUrl + adicionar refetch  
3. **Admin PDF Completo** (linhas 2084-2137): Corrigir catch + setGeneratedPdfUrl + adicionar refetch
