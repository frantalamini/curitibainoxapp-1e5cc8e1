import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Settings = () => {
  const { settings, isLoading, updateSettings } = useSystemSettings();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);

    try {
      // Upload para storage
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("service-call-attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obter URL assinada (bucket privado) - válida por 1 ano para logos
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("service-call-attachments")
        .createSignedUrl(filePath, 31536000); // 1 ano em segundos

      if (signedUrlError || !signedUrlData) {
        throw new Error("Não foi possível gerar URL de acesso à logo");
      }

      // Atualizar settings
      await updateSettings.mutateAsync({ logo_url: signedUrlData.signedUrl });
      
      setPreviewUrl(signedUrlData.signedUrl);
      toast.success("Logo atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da logo");
    } finally {
      setUploading(false);
    }
  };

  const currentLogoUrl = previewUrl || settings?.logo_url;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Logo do Sistema</CardTitle>
            <CardDescription>
              Personalize a logo exibida no menu lateral e cabeçalho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview da Logo Atual */}
            <div className="space-y-2">
              <Label>Logo Atual</Label>
              <div className="border rounded-lg p-8 bg-muted/50 flex items-center justify-center min-h-[200px]">
                {currentLogoUrl ? (
                  <img
                    src={currentLogoUrl}
                    alt="Logo atual"
                    className="max-h-32 object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                    <p>Nenhuma logo personalizada</p>
                    <p className="text-sm">Usando logo padrão</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload de Nova Logo */}
            <div className="space-y-2">
              <Label htmlFor="logo-upload">Atualizar Logo</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Enviando..." : "Escolher Nova Logo"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: PNG, JPG, WEBP. Tamanho máximo: 2MB
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
