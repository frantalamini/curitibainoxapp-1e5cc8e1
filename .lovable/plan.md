
# Plano: Módulo de Vendas Completo

## Visão Geral

Implementar um módulo de **Vendas** separado das Ordens de Serviço, com fluxo completo desde orçamento até faturamento. O módulo reutiliza a infraestrutura existente (produtos, clientes, transações financeiras, estoque) mas com entidades e interfaces próprias.

---

## Arquitetura do Módulo

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         MÓDULO DE VENDAS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │  ORÇAMENTO  │────▶│    VENDA    │────▶│  FATURADO   │               │
│  │  (QUOTE)    │     │   (SALE)    │     │  (INVOICED) │               │
│  └─────────────┘     └─────────────┘     └─────────────┘               │
│         │                   │                   │                      │
│         ▼                   ▼                   ▼                      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │   Produtos  │     │   Estoque   │     │    NF-e     │               │
│  │   + Itens   │     │  (Baixa)    │     │  (Futuro)   │               │
│  └─────────────┘     └─────────────┘     └─────────────┘               │
│                             │                                          │
│                             ▼                                          │
│                      ┌─────────────┐                                   │
│                      │  Financeiro │                                   │
│                      │  (Parcelas) │                                   │
│                      └─────────────┘                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Estrutura de Dados (Banco de Dados)

### Novas Tabelas

**1. sales (Vendas/Orçamentos)**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| sale_number | serial | Número sequencial |
| status | enum | QUOTE, APPROVED, SALE, INVOICED, CANCELLED |
| client_id | uuid | FK para clients |
| seller_id | uuid | FK para profiles (vendedor) |
| subtotal | numeric | Soma dos itens |
| discount_value | numeric | Desconto total |
| discount_type | text | 'value' ou 'percent' |
| total | numeric | Valor final |
| commission_percent | numeric | % comissão vendedor |
| commission_value | numeric | Valor da comissão |
| notes | text | Observações |
| quote_valid_until | date | Validade do orçamento |
| approved_at | timestamp | Data de aprovação |
| invoiced_at | timestamp | Data de faturamento |
| invoice_number | text | Número da NF (futuro) |
| created_at | timestamp | Criação |

**2. sale_items (Itens da Venda)**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| sale_id | uuid | FK para sales |
| product_id | uuid | FK para products |
| description | text | Descrição do item |
| qty | numeric | Quantidade |
| unit_price | numeric | Preço unitário |
| discount_value | numeric | Desconto do item |
| discount_type | text | 'value' ou 'percent' |
| total | numeric | Subtotal do item |
| stock_deducted | boolean | Se já baixou estoque |

**3. sale_statuses (Status personalizáveis)**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome do status |
| color | varchar | Cor do badge |
| status_type | enum | 'orcamento' ou 'venda' |
| is_default | boolean | Status padrão |
| display_order | integer | Ordem de exibição |

### Enum para Status
```sql
CREATE TYPE sale_status AS ENUM ('QUOTE', 'APPROVED', 'SALE', 'INVOICED', 'CANCELLED');
```

### Atualização da Tabela Existente
- `financial_transactions`: adicionar origin = 'SALE' ao enum `transaction_origin`
- `stock_movements`: adicionar reference_type = 'SALE' como opção

---

## Fase 2: Interface do Usuário

### 2.1 Menu de Navegação
Adicionar no menu lateral (após Chamados Técnicos):
- **Vendas**
  - Orçamentos
  - Vendas
  - Relatórios

### 2.2 Páginas Principais

**Listagem de Vendas/Orçamentos** (`/sales`)
- Tabs: Orçamentos | Vendas | Todos
- Filtros: Status, Cliente, Período, Vendedor
- Tabela com: Número, Cliente, Data, Total, Status, Ações
- Botão: "Novo Orçamento"

**Formulário de Venda** (`/sales/new` e `/sales/:id`)
- Seleção de cliente (AsyncSelect existente)
- Grid de produtos com busca
- Cálculo automático de totais
- Seção de descontos (igual ao financeiro da OS)
- Seção de pagamento (parcelas, formas)
- Comissão do vendedor
- Botões: Salvar Orçamento, Aprovar, Finalizar Venda

**Visualização de Venda** (`/sales/:id/view`)
- Dados do cliente
- Itens vendidos
- Histórico de status
- Parcelas financeiras
- Botões: Editar, Gerar PDF, Enviar WhatsApp

### 2.3 Componentes Reutilizáveis
- `SaleItemsTable` - Grid de itens (baseado no FinanceiroTab)
- `SalePaymentSection` - Parcelas e formas de pagamento
- `SaleStatusBadge` - Badge colorido de status
- `SellerSelect` - Seletor de vendedor com comissão

---

## Fase 3: Lógica de Negócio

### 3.1 Fluxo de Estados

```text
     ┌──────────────────────────────────────────────────────────────┐
     │                                                              │
     ▼                                                              │
┌─────────┐     ┌──────────┐     ┌────────┐     ┌──────────┐       │
│  QUOTE  │────▶│ APPROVED │────▶│  SALE  │────▶│ INVOICED │       │
└─────────┘     └──────────┘     └────────┘     └──────────┘       │
     │                                │                             │
     │                                │                             │
     └────────────────────────────────┼─────────────────────────────┘
                                      │          (Cancelar)
                                      ▼
                               ┌────────────┐
                               │ CANCELLED  │
                               └────────────┘
```

### 3.2 Ações por Status

| Status | Ações Disponíveis |
|--------|-------------------|
| QUOTE | Editar, Aprovar, Cancelar, Duplicar |
| APPROVED | Finalizar Venda, Editar, Cancelar |
| SALE | Visualizar, Gerar NF (futuro), Cancelar |
| INVOICED | Apenas Visualizar |
| CANCELLED | Duplicar (criar novo orçamento) |

### 3.3 Baixa Automática de Estoque
- Acontece ao mudar status para `SALE`
- Cria `stock_movements` com type='OUT' e reference_type='SALE'
- Valida estoque disponível antes da baixa
- Se cancelar venda, reverte movimentação (IN)

### 3.4 Geração de Parcelas Financeiras
- Ao finalizar venda (`SALE`), gera registros em `financial_transactions`
- direction='RECEIVE', origin='SALE'
- Reutiliza lógica do `generateInstallments` existente

### 3.5 Comissão de Vendedor
- Calculada automaticamente: `total * commission_percent / 100`
- Exibida no formulário e relatórios
- Futuramente: gerar conta a pagar para vendedor

---

## Fase 4: Relatórios de Vendas

### Dashboard de Vendas
- Total de Vendas (período)
- Ticket Médio
- Vendas por Vendedor
- Vendas por Produto
- Conversão Orçamento → Venda

### Relatórios Específicos
1. **Vendas por Período**: Filtro de datas, agrupamento por dia/semana/mês
2. **Vendas por Vendedor**: Ranking, comissões, metas
3. **Vendas por Produto**: Mais vendidos, margem, estoque
4. **Orçamentos Pendentes**: Orçamentos abertos, vencidos, taxa de conversão

---

## Fase 5: Preparação para NF-e (Futuro)

### Campos já preparados
- `invoice_number` na tabela sales
- `invoiced_at` timestamp
- Produtos já têm: NCM, GTIN, CEST, origem, impostos

### Integração Futura
- API de emissão (WebmaniaBR, Focco, etc.)
- Certificado digital A1
- Edge function para comunicação com SEFAZ
- Campos adicionais conforme legislação

---

## Estrutura de Arquivos

```text
src/
├── pages/
│   └── vendas/
│       ├── Sales.tsx            # Listagem
│       ├── SaleForm.tsx         # Novo/Editar
│       ├── SaleView.tsx         # Visualização
│       ├── SalesReports.tsx     # Relatórios
│       └── SalesDashboard.tsx   # Dashboard
├── components/
│   └── vendas/
│       ├── SaleItemsTable.tsx
│       ├── SalePaymentSection.tsx
│       ├── SaleStatusBadge.tsx
│       ├── SaleActionsMenu.tsx
│       ├── SellerSelect.tsx
│       ├── SaleQuotePDF.tsx     # Geração de PDF
│       └── SaleMobileCard.tsx
├── hooks/
│   ├── useSales.ts
│   ├── useSaleItems.ts
│   ├── useSaleStatuses.ts
│   └── useSalesReport.ts
```

---

## Cronograma de Implementação

| Fase | Descrição | Componentes |
|------|-----------|-------------|
| **1** | Banco de dados | Tabelas, enums, RLS |
| **2** | Hooks base | useSales, useSaleItems |
| **3** | Listagem | Sales.tsx, cards, tabela |
| **4** | Formulário | SaleForm.tsx, itens, pagamento |
| **5** | Visualização | SaleView.tsx, status, ações |
| **6** | Estoque | Baixa automática, validação |
| **7** | Financeiro | Integração com parcelas |
| **8** | Relatórios | Dashboard, vendas por período |
| **9** | PDF/WhatsApp | Geração de documentos |

---

## Seção Técnica

### Migração SQL Inicial

```sql
-- Enum para status de venda
CREATE TYPE sale_status AS ENUM ('QUOTE', 'APPROVED', 'SALE', 'INVOICED', 'CANCELLED');

-- Adicionar SALE ao transaction_origin
ALTER TYPE transaction_origin ADD VALUE 'SALE';

-- Tabela principal de vendas
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number integer NOT NULL DEFAULT nextval('sales_number_seq'::regclass),
  status sale_status NOT NULL DEFAULT 'QUOTE',
  client_id uuid NOT NULL REFERENCES clients(id),
  seller_id uuid REFERENCES profiles(user_id),
  subtotal numeric NOT NULL DEFAULT 0,
  discount_type text DEFAULT 'value',
  discount_value numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  commission_percent numeric DEFAULT 0,
  commission_value numeric DEFAULT 0,
  notes text,
  quote_valid_until date,
  approved_at timestamptz,
  invoiced_at timestamptz,
  invoice_number text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sequência para numeração
CREATE SEQUENCE sales_number_seq START 1;

-- Itens da venda
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_type text DEFAULT 'value',
  discount_value numeric DEFAULT 0,
  total numeric NOT NULL,
  stock_deducted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Policies (admin only para início)
CREATE POLICY "Admins can manage sales" ON sales
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage sale items" ON sale_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Hook Principal (useSales.ts)

```typescript
export const useSales = () => {
  // Listagem com filtros
  // CRUD operations
  // Mutations: approve, finalize, cancel
  // Integração com estoque e financeiro
};
```

### Integração com Estoque

```typescript
const finalizeSale = async (saleId: string) => {
  // 1. Buscar itens da venda
  // 2. Validar estoque disponível
  // 3. Criar stock_movements (OUT)
  // 4. Atualizar status para SALE
  // 5. Gerar financial_transactions
};
```
