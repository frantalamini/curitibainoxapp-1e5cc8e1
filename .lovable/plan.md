
# Plano: Correção de Layout Responsivo das Tabelas

## Problema Identificado

As tabelas do aplicativo estão usando larguras fixas em pixels (`width: '60px'`, `w-20`, `min-w-[120px]`) que impedem a adaptação ao tamanho da tela. Isso causa:
- Overflow horizontal em monitores de 13" e 15"
- Necessidade de usar zoom para visualizar todo o conteúdo
- Layout cortado sem scroll visível

## Referência Visual (Olist/Tiny ERP)

O sistema de referência usa:
- Fonte legível mas compacta
- Colunas proporcionais que se adaptam à tela
- Textos truncados com elipses quando necessário
- Menos colunas visíveis, priorizando informação essencial
- Margens e espaçamentos adequados

## Estratégia de Correção

Substituir larguras fixas por:
1. **Larguras proporcionais** usando porcentagens ou `fr` units
2. **Larguras mínimas** reduzidas para colunas numéricas
3. **Truncamento inteligente** para textos longos
4. **Remoção de `table-layout: fixed`** para permitir flexibilidade

## Arquivos a Modificar

### 1. Componente Base de Tabela (`src/components/ui/table.tsx`)

**Mudanças:**
- Remover `table-fixed` do className padrão
- Usar `table-auto` para permitir ajuste automático de colunas

```
Antes:
<table className="w-full caption-bottom text-sm table-fixed" />

Depois:
<table className="w-full caption-bottom text-sm" />
```

### 2. Listagem de OS (`src/pages/ServiceCalls.tsx`)

**Mudanças:**
- Remover `minWidth: '700px'` e `tableLayout: 'fixed'`
- Substituir `<colgroup>` com larguras fixas por classes Tailwind proporcionais
- Reduzir `max-w` das células de texto

```
Colunas Atuais (fixas):
- Nº OS: 60px
- Cliente: minWidth 140px
- Técnico: 90px
- St. Técnico: 130px
- St. Comercial: 130px
- Ações: 60px

Proposta (proporcionais):
- Nº OS: w-[7%] (min 50px)
- Cliente: flex-1 ou w-[30%]
- Técnico: w-[12%]
- St. Técnico: w-[18%]
- St. Comercial: w-[18%]
- Ações: w-[8%]
```

### 3. Aba Financeiro (`src/components/os-financeiro/FinanceiroTab.tsx`)

**Tabela de Peças/Produtos e Serviços (linhas 598-647, 733-776):**

```
Colunas Atuais:
- Item: auto
- Qtd: w-14 (56px)
- Unit.: w-20 (80px)
- Subtot.: w-20 (80px)
- %Desc: w-14 (56px)
- R$Desc: w-16 (64px)
- Total: w-20 (80px)
- Ações: w-8 (32px)

Proposta:
- Item: flex-1
- Qtd: w-10 (40px)
- Unit.: w-16 (64px)
- Subtot.: hidden em telas pequenas
- %Desc: w-12 (48px)
- R$Desc: w-14 (56px)
- Total: w-16 (64px)
- Ações: w-6 (24px)
```

**Tabela de Parcelas (linhas 999-1008):**

```
Colunas Atuais:
- Nº: w-12 (48px)
- Dias: w-14 (56px)
- Data: w-28 (112px)
- Valor: w-24 (96px)
- Forma: w-32 (128px)
- Obs: min-w-[120px]
- Ações: w-24 (96px)

Proposta:
- Nº: w-10 (40px)
- Dias: w-10 (40px)
- Data: w-20 (80px) ou auto
- Valor: w-16 (64px)
- Forma: w-20 (80px)
- Obs: flex-1 (sem min-width)
- Ações: w-16 (64px)
```

### 4. Tabela de Cadastros (`src/components/CadastrosTable.tsx`)

**Mudanças:**
- Reduzir largura do checkbox de w-12 para w-10
- Reduzir largura do código de w-20 para w-16
- Reduzir max-w do nome de 250px para 180px
- Aplicar truncate em textos longos

### 5. Contas a Receber (`src/pages/financas/ContasAReceber.tsx`)

**Mudanças:**
- Aplicar classes responsivas nas colunas
- Reduzir larguras fixas
- Usar truncate em observações

## Padrões a Aplicar Globalmente

### Tamanhos Reduzidos para Colunas Numéricas
```
Antes → Depois
w-24 → w-16
w-20 → w-14
w-14 → w-10
w-12 → w-8
```

### Inputs Compactos em Formulários
```
Botão "+" de adicionar: w-8 (32px) em vez de w-full
Select de forma de pagamento: w-24 em vez de w-32
```

### Classes de Truncamento
```css
/* Texto com no máximo 2 linhas */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Texto em 1 linha com elipse */
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

## Detalhes Técnicos

### Remoção de Larguras Mínimas Fixas

```
// ServiceCalls.tsx - REMOVER
<div style={{ minWidth: '700px' }}>

// table.tsx - ALTERAR
table-fixed → table-auto
```

### Grid de Formulário Compacto (FinanceiroTab)

```
// Atual (7 colunas): não cabe em telas pequenas
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7

// Proposto (5 colunas + flow dinâmico)
grid-cols-2 md:grid-cols-4 lg:grid-cols-6
```

## Critérios de Aceite

| Critério | Validação |
|----------|-----------|
| Monitor 13" (1366px) | Tabelas cabem sem scroll horizontal |
| Monitor 15" (1920px) | Layout confortável com espaçamento adequado |
| Zoom 100% | Todo conteúdo visível |
| Textos longos | Truncados com elipse, tooltip no hover |
| Botões de ação | Visíveis e clicáveis |
| Fonte legível | Mínimo 12px para conteúdo principal |

## Observações Importantes

- **NÃO** serão alterados: autenticação, permissões, rotas, funcionalidades existentes
- **NÃO** serão alterados: FinanceiroGuard, estrutura de abas, cadastros
- **APENAS** dimensionamento visual de colunas e espaçamentos
- O layout usará proporções em vez de pixels fixos
- Scroll horizontal só aparecerá se absolutamente necessário (conteúdo genuinamente largo)
