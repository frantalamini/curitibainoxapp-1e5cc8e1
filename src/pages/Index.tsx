import MainLayout from "@/components/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileHome from "@/components/mobile/MobileHome";
import DesktopHome from "@/components/desktop/DesktopHome";

const Index = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileHome />;
  }

  return (
    <MainLayout>
      <DesktopHome />
    </MainLayout>
  );
};

export default Index;
