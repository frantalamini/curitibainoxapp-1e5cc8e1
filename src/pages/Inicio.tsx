import MobileHome from "@/components/mobile/MobileHome";

/**
 * Página dedicada que sempre renderiza o menu circular (MobileHome)
 * Independente do tamanho da tela detectado pelo useIsMobile()
 * 
 * Isso garante que usuários de iPhone/Android sempre consigam
 * acessar o menu principal mesmo se o detector de mobile falhar
 */
const Inicio = () => {
  return <MobileHome />;
};

export default Inicio;
