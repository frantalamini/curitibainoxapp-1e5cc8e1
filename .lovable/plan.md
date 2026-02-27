

## Abrir app em nova aba via clique direito no logo

### O que sera feito

Transformar o logo da sidebar (desktop e mobile) de uma simples imagem para um **link HTML nativo** (`<a href="/">`). Isso permite que o navegador ofereça automaticamente as opcoes de "Abrir em nova guia" e "Abrir em nova janela" ao clicar com o botao direito -- comportamento padrao de qualquer link.

### Como vai funcionar

- **Clique normal** no logo: navega para a pagina inicial (comportamento atual mantido)
- **Clique direito** no logo: mostra o menu de contexto do navegador com opcoes como "Abrir link em nova guia", "Abrir link em nova janela"
- Permite trabalhar com **duas telas do aplicativo simultaneamente**

### O que muda

**Arquivo:** `src/components/MainLayout.tsx`

1. **Logo do desktop sidebar** (coluna 1): trocar `<img>` por `<a href="/">` envolvendo o `<img>`, mantendo o mesmo estilo visual
2. **Logo do mobile header**: o botao que ja existe com `onClick={() => navigate("/")}` sera trocado por um `<a href="/">` para ter o mesmo comportamento nativo de link

### O que NAO muda

- Layout, estilos, posicionamento
- Navegacao existente
- Menus, abas, filtros
- Nenhum outro componente ou arquivo
