
## Plano de Correção: Sincronização de Dados no PWA

### Problema Identificado

O PWA instalado no celular dos técnicos não está recebendo as atualizações dos chamados técnicos. A causa raiz é uma combinação de:

1. **Cache do Service Worker** - Armazena respostas do banco de dados por até 5 minutos
2. **Cache do React Query** - Combinado com `refetchOnWindowFocus: false`, dados ficam estagnados
3. **PWA não atualiza automaticamente** - O Service Worker antigo continua ativo até ser forçado a atualizar

### Solução Proposta

#### 1. Ajustar Configuração do Service Worker (vite.config.ts)

Modificar a estratégia de cache para requisições ao Supabase:

```text
ANTES:
- handler: 'NetworkFirst'
- maxAgeSeconds: 60 * 5 (5 minutos)
- networkTimeoutSeconds: 10

DEPOIS:
- handler: 'NetworkOnly' (sempre busca da rede, nunca serve cache)
- Remover configuração de cache para API do Supabase
```

Isso garante que os dados do banco de dados sempre venham diretamente do servidor, sem intermediação de cache.

#### 2. Adicionar Lógica de Atualização Automática do PWA (src/main.tsx)

Implementar o registro do Service Worker com atualização automática:

```text
- Usar useRegisterSW do vite-plugin-pwa
- Configurar para checar atualizações a cada 60 segundos
- Quando houver nova versão, recarregar automaticamente a página
```

Isso força o PWA a baixar a nova versão do app assim que disponível.

#### 3. Ajustar React Query para Refetch no PWA (src/App.tsx)

Modificar as configurações padrão do QueryClient:

```text
ANTES:
- refetchOnWindowFocus: false

DEPOIS:
- refetchOnWindowFocus: true (padrão - reativa)
```

Quando o técnico voltar ao app após usar outro aplicativo, os dados serão atualizados automaticamente.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| vite.config.ts | Remover cache de API do Supabase (usar NetworkOnly) |
| src/main.tsx | Adicionar registro do SW com auto-update |
| src/App.tsx | Reativar refetchOnWindowFocus |

### Impacto

- **Dados sempre atualizados** - Nenhum cache entre o app e o banco
- **PWA auto-atualiza** - Novas versões são aplicadas automaticamente
- **Compatível com todos usuários** - Mesma experiência para admin e técnicos

### Orientação para Técnicos (após publicar)

Para forçar a atualização imediata no PWA já instalado:
1. Fechar completamente o app (remover da lista de apps recentes)
2. Reabrir o app
3. Se ainda não funcionar: desinstalar o PWA e reinstalar
