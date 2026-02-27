

## Reorganizar botoes de acoes do PDF

### Problema atual
Apos gerar o PDF, os botoes (Visualizar PDF, Salvar PDF, Enviar via WhatsApp, Enviar por E-mail) ficam dispostos de forma desorganizada usando `flex-wrap`, sem estrutura visual clara. Alem disso, o botao "Salvar PDF" depende do `pdfBlobUrl` que pode nao estar disponivel em todos os cenarios.

### Solucao

**Arquivo: `src/pages/ServiceCallForm.tsx` (linhas 2221-2278)**

Reorganizar o bloco de acoes do PDF com layout responsivo:

1. **Layout em grid responsivo**: Substituir o `flex-wrap` por um `grid` com 2 colunas no mobile e 4 colunas no desktop, garantindo botoes alinhados e proporcionais
2. **Mensagem de sucesso separada**: Mover o texto "PDF gerado com sucesso" para uma linha propria acima dos botoes
3. **Botoes uniformes**: Todos os botoes com mesma altura e `flex-1` dentro do grid para ficarem proporcionais
4. **Corrigir Salvar PDF**: Garantir que o botao "Salvar PDF" funcione mesmo quando so existe `generatedPdfUrl` (sem blob local), fazendo download via `fetch` + blob quando necessario. Tambem exibir o botao sempre (nao apenas quando `pdfBlob` existe), ja que o PDF esta salvo no storage

### Estrutura visual esperada

```text
[check] PDF gerado com sucesso

[ Visualizar PDF ] [ Salvar PDF    ]
[ WhatsApp       ] [ E-mail        ]
```

No desktop, os 4 botoes ficam lado a lado em uma unica linha.

### Detalhes tecnicos

- Trocar `flex flex-wrap gap-2` por `grid grid-cols-2 sm:grid-cols-4 gap-2`
- Mover o texto de sucesso para fora do grid, como um `<p>` separado
- No botao "Salvar PDF": remover condicao `{pdfBlob && ...}`, e no `onClick` usar `pdfBlobUrl` se disponivel, senao fazer `fetch(generatedPdfUrl)` para obter o blob e disparar download
- Manter as cores dos botoes WhatsApp (verde) e E-mail (azul)

