import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { extractColorsFromImage, ExtractedColor } from '@/lib/colorExtractor';
import { toast } from '@/hooks/use-toast';

interface LogoPaletteExtractorProps {
  onPaletteGenerated: (colors: ExtractedColor[]) => void;
}

export function LogoPaletteExtractor({ onPaletteGenerated }: LogoPaletteExtractorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.match(/^image\/(png|jpeg|jpg)$/)) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione uma imagem PNG ou JPG.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const colors = await extractColorsFromImage(file);
      onPaletteGenerated(colors);
      toast({
        title: 'Análise concluída',
        description: 'Paleta de cores gerada com sucesso!',
      });
    } catch (error) {
      console.error('Error extracting colors:', error);
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível extrair as cores da imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Importar Logo e Gerar Paleta Automática
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleInputChange}
          />
          
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Logo preview"
                className="max-h-32 mx-auto object-contain"
              />
              <p className="text-sm text-muted-foreground">{file?.name}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">
                Arraste uma logo ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                PNG ou JPG, máx. 2MB
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={!file || isAnalyzing}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              'Analisar Logo e Gerar Paleta'
            )}
          </Button>
          
          {file && (
            <Button variant="outline" onClick={handleClear}>
              Limpar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
