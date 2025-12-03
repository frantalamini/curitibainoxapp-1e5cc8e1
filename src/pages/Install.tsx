import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // Detectar quando o app foi instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">App Instalado!</h2>
            <p className="text-muted-foreground">
              O Curitiba Inox já está na sua tela inicial.
            </p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.href = '/'}
            >
              Abrir o App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <img 
            src="/pwa-192x192.png" 
            alt="Curitiba Inox" 
            className="h-20 w-20 mx-auto mb-2"
          />
          <CardTitle className="text-primary">Instalar Curitiba Inox</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Adicione o app à sua tela inicial para acesso rápido
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isIOS ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">No iPhone/iPad:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Toque no botão <strong className="text-foreground">Compartilhar</strong> (ícone de quadrado com seta para cima)</li>
                <li>Role para baixo e toque em <strong className="text-foreground">"Adicionar à Tela de Início"</strong></li>
                <li>Toque em <strong className="text-foreground">"Adicionar"</strong> no canto superior direito</li>
              </ol>
              <div className="bg-muted p-3 rounded-lg mt-4">
                <p className="text-xs text-muted-foreground">
                  💡 Após instalar, o app abrirá em tela cheia como um aplicativo nativo.
                </p>
              </div>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Instalar na Tela Inicial
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                O app será instalado e abrirá em tela cheia
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-medium">No Android/Chrome:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Toque no menu <strong className="text-foreground">⋮</strong> (três pontos no canto superior)</li>
                <li>Toque em <strong className="text-foreground">"Instalar aplicativo"</strong> ou <strong className="text-foreground">"Adicionar à tela inicial"</strong></li>
                <li>Confirme tocando em <strong className="text-foreground">"Instalar"</strong></li>
              </ol>
              <div className="bg-muted p-3 rounded-lg mt-4">
                <p className="text-xs text-muted-foreground">
                  💡 Se o botão de instalação não aparecer automaticamente, use o menu do navegador.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Benefícios do App Instalado
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✓ Abre em tela cheia (sem barra do navegador)</li>
              <li>✓ Acesso rápido pela tela inicial</li>
              <li>✓ Carregamento mais rápido</li>
              <li>✓ Funciona como app nativo</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
