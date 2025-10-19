import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    // Validar tamanho (máximo 10MB em base64)
    if (audio.length > 14000000) {
      throw new Error('Arquivo de áudio muito grande. Máximo: 10MB');
    }

    console.log('Audio size:', (audio.length / 1024 / 1024).toFixed(2), 'MB (base64)');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Processing audio for transcription with Lovable AI (Gemini)...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Você é um assistente de transcrição especializado em serviços técnicos de manutenção. Transcreva fielmente o áudio a seguir em português brasileiro, mantendo todos os detalhes técnicos mencionados pelo técnico. Se houver termos técnicos, equipamentos, marcas ou procedimentos, mantenha-os exatamente como foram ditos. Retorne APENAS a transcrição literal do áudio, sem adicionar, interpretar ou modificar nada.'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audio,
                  format: 'webm'
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns instantes.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Adicione créditos em Settings -> Workspace -> Usage.');
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const result = await response.json();
    const transcribedText = result.choices[0].message.content;
    
    console.log('Transcription successful');
    console.log('Transcribed text preview:', transcribedText.substring(0, 100));

    return new Response(
      JSON.stringify({ text: transcribedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
