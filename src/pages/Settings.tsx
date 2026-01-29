import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Image as ImageIcon, Save, Loader2, Palette } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useColorPalette } from "@/hooks/useColorPalette";
import { ColorCard } from "@/components/settings/ColorCard";
import { LogoPaletteExtractor } from "@/components/settings/LogoPaletteExtractor";
import { PaletteSuggestionModal } from "@/components/settings/PaletteSuggestionModal";
import { PaletteEditModal } from "@/components/settings/PaletteEditModal";
import { ExtractedColor } from "@/lib/colorExtractor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface CompanyFormData {
  company_name: string;
  company_cnpj: string;
  company_ie: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_address: string;
}

const Settings = () => {
  const { settings, isLoading, updateSettings } = useSystemSettings();
  const { colors, isLoading: isLoadingColors, updateColor, applyPalette } = useColorPalette();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingReportLogo, setUploadingReportLogo] = useState(false);
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(null);
  const [previewReportLogoUrl, setPreviewReportLogoUrl] = useState<string | null>(null);
  
  // State for palette extraction
  const [suggestedColors, setSuggestedColors] = useState<ExtractedColor[]>([]);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<CompanyFormData>({
    values: {
      company_name: settings?.company_name || "",
      company_cnpj: settings?.company_cnpj || "",
      company_ie: settings?.company_ie || "",
      company_phone: settings?.company_phone || "",
      company_email: settings?.company_email || "",
      company_website: settings?.company_website || "",
      company_address: settings?.company_address || "",
    },
  });

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "report"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    const setUploading = type === "logo" ? setUploadingLogo : setUploadingReportLogo;
    const setPreview = type === "logo" ? setPreviewLogoUrl : setPreviewReportLogoUrl;
    const fieldName = type === "logo" ? "logo_url" : "report_logo";

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("service-call-attachments")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("service-call-attachments")
        .createSignedUrl(filePath, 31536000);

      if (signedUrlError || !signedUrlData) {
        throw new Error("Não foi possível gerar URL de acesso à logo");
      }

      await updateSettings.mutateAsync({ [fieldName]: signedUrlData.signedUrl });
      
      setPreview(signedUrlData.signedUrl);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da logo");
    } finally {
      setUploading(false);
    }
  };

  const onSubmitCompanyData = async (data: CompanyFormData) => {
    try {
      await updateSettings.mutateAsync(data);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handlePaletteGenerated = (extractedColors: ExtractedColor[]) => {
    setSuggestedColors(extractedColors);
    setShowSuggestionModal(true);
  };

  const handleApplyExtractedPalette = async (colorsToApply: ExtractedColor[]) => {
    try {
      // Map extracted colors to database updates
      const roleToDbRole: Record<string, string> = {
        primary: 'primary',
        secondary: 'secondary',
        accent: 'accent',
        success: 'success',
        warning: 'warning',
        destructive: 'destructive',
      };

      for (const extractedColor of colorsToApply) {
        const existingColor = colors?.find(c => c.role === roleToDbRole[extractedColor.role]);
        if (existingColor) {
          await updateColor.mutateAsync({
            id: existingColor.id,
            hex: extractedColor.hex,
            rgb_r: extractedColor.rgb.r,
            rgb_g: extractedColor.rgb.g,
            rgb_b: extractedColor.rgb.b,
            hsl_h: extractedColor.hsl.h,
            hsl_s: extractedColor.hsl.s,
            hsl_l: extractedColor.hsl.l,
            cmyk_c: extractedColor.cmyk.c,
            cmyk_m: extractedColor.cmyk.m,
            cmyk_y: extractedColor.cmyk.y,
            cmyk_k: extractedColor.cmyk.k,
          });
        }
      }

      // Apply palette to CSS
      applyPalette();
      
      toast.success("Paleta aplicada com sucesso!");
    } catch (error) {
      console.error("Error applying palette:", error);
      toast.error("Erro ao aplicar a paleta");
    }
  };

  const handleApplyFromSuggestion = async () => {
    setShowSuggestionModal(false);
    await handleApplyExtractedPalette(suggestedColors);
  };

  const handleEditFromSuggestion = () => {
    setShowSuggestionModal(false);
    setShowEditModal(true);
  };

  const handleCancelSuggestion = () => {
    setShowSuggestionModal(false);
    setSuggestedColors([]);
  };

  const handleSaveEditedPalette = async (editedColors: ExtractedColor[]) => {
    setShowEditModal(false);
    await handleApplyExtractedPalette(editedColors);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
  };

  const currentLogoUrl = previewLogoUrl || settings?.logo_url;
  const currentReportLogoUrl = previewReportLogoUrl || settings?.report_logo;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize o sistema com sua marca e dados da empresa
          </p>
        </div>

        {/* Logos Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Logo do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logo do Sistema</CardTitle>
              <CardDescription>
                Exibida no menu lateral e cabeçalho do aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-6 bg-muted/50 flex items-center justify-center min-h-[160px]">
                {currentLogoUrl ? (
                  <img
                    src={currentLogoUrl}
                    alt="Logo do sistema"
                    className="max-h-24 object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">Nenhuma logo definida</p>
                  </div>
                )}
              </div>

              <div>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, "logo")}
                  disabled={uploadingLogo}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingLogo ? "Enviando..." : "Alterar Logo"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logo dos Relatórios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logo dos Relatórios</CardTitle>
              <CardDescription>
                Exibida em todas as OS e relatórios PDF gerados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-6 bg-muted/50 flex items-center justify-center min-h-[160px]">
                {currentReportLogoUrl ? (
                  <img
                    src={currentReportLogoUrl}
                    alt="Logo dos relatórios"
                    className="max-h-24 object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">Nenhuma logo definida</p>
                    <p className="text-xs">Usará a logo do sistema</p>
                  </div>
                )}
              </div>

              <div>
                <Input
                  id="report-logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, "report")}
                  disabled={uploadingReportLogo}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("report-logo-upload")?.click()}
                  disabled={uploadingReportLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingReportLogo ? "Enviando..." : "Alterar Logo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Importar Logo e Gerar Paleta Automática */}
        <LogoPaletteExtractor onPaletteGenerated={handlePaletteGenerated} />

        {/* Paleta de Cores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Paleta de Cores
            </CardTitle>
            <CardDescription>
              Personalize as cores do aplicativo. Edite cada cor nos formatos HEX, RGB, HSL ou CMYK.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingColors ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {colors?.map((color) => (
                    <ColorCard
                      key={color.id}
                      color={color}
                      onSave={(data) => updateColor.mutate(data)}
                      onDelete={() => {/* Colors are fixed, no delete */}}
                      isSaving={updateColor.isPending}
                    />
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={applyPalette}
                    className="w-full"
                    size="lg"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Aplicar Paleta ao App
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>
              Informações exibidas nos relatórios e documentos gerados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmitCompanyData)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="company_name">Nome da Empresa</Label>
                  <Input
                    id="company_name"
                    {...register("company_name")}
                    placeholder="Nome da sua empresa"
                  />
                </div>

                <div>
                  <Label htmlFor="company_cnpj">CNPJ</Label>
                  <Input
                    id="company_cnpj"
                    {...register("company_cnpj")}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <Label htmlFor="company_ie">Inscrição Estadual</Label>
                  <Input
                    id="company_ie"
                    {...register("company_ie")}
                    placeholder="000.000.000.000"
                  />
                </div>

                <div>
                  <Label htmlFor="company_phone">Telefone</Label>
                  <Input
                    id="company_phone"
                    {...register("company_phone")}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="company_email">E-mail</Label>
                  <Input
                    id="company_email"
                    type="email"
                    {...register("company_email")}
                    placeholder="contato@empresa.com.br"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="company_website">Site</Label>
                  <Input
                    id="company_website"
                    {...register("company_website")}
                    placeholder="https://www.empresa.com.br"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="company_address">Endereço Completo</Label>
                  <Textarea
                    id="company_address"
                    {...register("company_address")}
                    placeholder="Rua, número, bairro, cidade - UF, CEP"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Salvando..." : "Salvar Dados"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <PaletteSuggestionModal
        open={showSuggestionModal}
        onOpenChange={setShowSuggestionModal}
        suggestedColors={suggestedColors}
        onApply={handleApplyFromSuggestion}
        onEdit={handleEditFromSuggestion}
        onCancel={handleCancelSuggestion}
      />

      <PaletteEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        colors={suggestedColors}
        onSave={handleSaveEditedPalette}
        onCancel={handleCancelEdit}
      />
    </MainLayout>
  );
};

export default Settings;
