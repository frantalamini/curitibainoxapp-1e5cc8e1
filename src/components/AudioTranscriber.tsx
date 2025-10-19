import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AudioTranscriberProps {
  onTranscriptionComplete: (text: string, audioFile: File | null) => void;
  initialText?: string;
}

export const AudioTranscriber = ({ onTranscriptionComplete, initialText = "" }: AudioTranscriberProps) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState(initialText);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      audioChunks.current = [];
      
      recorder.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'diagnosis.webm', { type: 'audio/webm' });
        setAudioFile(file);
        
        await transcribeAudio(audioBlob);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        console.log('Calling transcribe-audio function...');
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        if (error) {
          console.error('Transcription error:', error);
          throw error;
        }
        
        setTranscribedText(data.text);
        toast({
          title: "Transcrição Concluída",
          description: "Revise o texto e clique em 'Confirmar Diagnóstico' para salvar.",
        });
      };
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Erro ao Transcrever",
        description: "A transcrição automática falhou. Por favor, digite o diagnóstico manualmente ou clique em 'Confirmar Diagnóstico' para salvar apenas o áudio.",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSave = () => {
    if (!transcribedText.trim() && !audioFile) {
      toast({
        title: "Atenção",
        description: "Por favor, grave um áudio ou digite o diagnóstico",
        variant: "destructive"
      });
      return;
    }
    
    onTranscriptionComplete(transcribedText, audioFile);
    
    toast({
      title: "✅ Diagnóstico Confirmado",
      description: "Diagnóstico salvo com sucesso!",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Descrição do Problema (Técnico)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Gravar Áudio ou Digitar</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
            >
              {isRecording ? <Square className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
              {isRecording ? "Parar Gravação" : "Gravar Áudio"}
            </Button>
            
            {isTranscribing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transcrevendo áudio...
              </div>
            )}
          </div>
          
          {audioFile && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
              <CheckCircle className="h-4 w-4" />
              Áudio gravado: {audioFile.name} ({(audioFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Texto Transcrito / Digite Aqui</Label>
          <Textarea
            value={transcribedText}
            onChange={(e) => setTranscribedText(e.target.value)}
            placeholder="O áudio será transcrito automaticamente aqui, ou você pode digitar..."
            rows={6}
          />
        </div>

        <Button type="button" onClick={handleSave}>
          Confirmar Diagnóstico
        </Button>
      </CardContent>
    </Card>
  );
};
