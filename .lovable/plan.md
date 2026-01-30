

# Plano: Atualizar Ícone PWA com Nova Logo

## Imagem Recebida
Logo "CI" (Curitiba Inox) com fundo cinza metalizado - perfeita para ícone de app.

## Ações a Executar

### 1. Substituir Ícones PWA
Copiar a nova imagem para os arquivos de ícone do PWA:
- `public/pwa-192x192.png` - ícone padrão 192x192
- `public/pwa-512x512.png` - ícone de alta resolução 512x512

### 2. Arquivos Afetados
```
public/
├── pwa-192x192.png  ← substituir
└── pwa-512x512.png  ← substituir
```

## Após a Atualização
Para ver o novo ícone no Android:
1. **Desinstale** o app da tela inicial
2. **Limpe o cache** do Chrome (Configurações > Apps > Chrome > Armazenamento > Limpar cache)
3. **Reinstale** o app via menu "Adicionar à tela inicial" ou página `/install`

## Observação Técnica
A configuração do manifest em `vite.config.ts` já está correta, referenciando esses arquivos. Apenas a substituição das imagens é necessária.

