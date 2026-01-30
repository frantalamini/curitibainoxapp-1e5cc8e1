

# Plano: Corrigir Ícone do App no Android

## O Problema
O ícone que aparece na tela inicial do Android está incorreto porque os arquivos de ícone PWA (`pwa-192x192.png` e `pwa-512x512.png`) não correspondem ao logo da empresa Curitiba Inox.

## Solução

### Opção 1: Usar a logo que já está configurada no sistema
Se você já tem uma logo configurada nas Configurações do sistema (`system_settings.logo_url`), posso:
- Baixar essa imagem e criar versões otimizadas para PWA
- Substituir os arquivos `pwa-192x192.png` e `pwa-512x512.png`

### Opção 2: Você enviar um ícone quadrado
Para o melhor resultado, você pode enviar uma imagem:
- **Formato**: PNG com fundo transparente ou colorido
- **Tamanho mínimo**: 512x512 pixels
- **Formato ideal**: Quadrado (1:1)
- **Dica**: O Android recorta o ícone em formato circular ou com cantos arredondados

### O que será feito:
1. Substituir `public/pwa-192x192.png` pelo novo ícone (192x192px)
2. Substituir `public/pwa-512x512.png` pelo novo ícone (512x512px)
3. Adicionar ícone "maskable" separado (para Android Adaptive Icons)

### Importante - Após a atualização:
Para ver o novo ícone, o usuário precisa:
1. **Desinstalar** o app da tela inicial
2. **Limpar o cache** do navegador Chrome
3. **Reinstalar** o app pelo menu ou página `/install`

## Próximo Passo
**Você pode me enviar a logo/ícone que deseja usar?** (imagem quadrada, de preferência 512x512px ou maior)

Ou me diga onde posso encontrar a logo atual do sistema que você quer usar como ícone do app.

