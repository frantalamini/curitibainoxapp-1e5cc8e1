

## Ajuste de largura das abas na pagina de Vendas

O problema e que as 5 abas estao comprimidas dentro de um container com largura maxima `max-w-xl` (576px), o que da aproximadamente 115px por aba -- insuficiente para exibir icone + texto + contagem sem sobreposicao.

### Correcao

**Arquivo:** `src/pages/vendas/Sales.tsx` (linha 137)

Alterar a classe do `TabsList` de `max-w-xl` para `max-w-2xl` (672px), dando ~134px por aba, espaco suficiente para o conteudo sem sobreposicao.

```
Antes:  <TabsList className="grid grid-cols-5 w-full max-w-xl">
Depois: <TabsList className="grid grid-cols-5 w-full max-w-2xl">
```

Nenhum outro arquivo ou funcionalidade sera alterado.
