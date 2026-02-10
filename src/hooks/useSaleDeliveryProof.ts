import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SaleDeliveryProof {
  id: string;
  sale_id: string;
  trip_id: string | null;
  delivered_by: string | null;
  receiver_name: string;
  receiver_position: string | null;
  signature_storage_path: string;
  photo_urls: string[];
  notes: string | null;
  delivered_at: string;
  created_at: string;
}

export const useSaleDeliveryProof = (saleId?: string) => {
  return useQuery({
    queryKey: ["sale-delivery-proof", saleId],
    queryFn: async () => {
      if (!saleId) return null;

      const { data, error } = await supabase
        .from("sale_delivery_proofs")
        .select("*")
        .eq("sale_id", saleId)
        .maybeSingle();

      if (error) throw error;
      return data as SaleDeliveryProof | null;
    },
    enabled: !!saleId,
  });
};

export const useSaleDeliveryProofMutations = () => {
  const queryClient = useQueryClient();

  const uploadFile = async (file: File | Blob, path: string): Promise<string> => {
    const { error } = await supabase.storage
      .from("sale-attachments")
      .upload(path, file, { upsert: true });

    if (error) throw error;
    return path;
  };

  const getSignedUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("sale-attachments")
      .createSignedUrl(path, 7 * 24 * 60 * 60); // 7 days

    if (error) throw error;
    return data.signedUrl;
  };

  const createProof = useMutation({
    mutationFn: async ({
      saleId,
      tripId,
      receiverName,
      receiverPosition,
      signatureDataUrl,
      photoFiles,
      notes,
    }: {
      saleId: string;
      tripId?: string;
      receiverName: string;
      receiverPosition?: string;
      signatureDataUrl: string;
      photoFiles: File[];
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload signature
      const signatureBlob = await fetch(signatureDataUrl).then(r => r.blob());
      const signaturePath = `deliveries/${saleId}/signature_${Date.now()}.png`;
      await uploadFile(signatureBlob, signaturePath);

      // Upload photos
      const photoUrls: string[] = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const photoPath = `deliveries/${saleId}/photo_${Date.now()}_${i}.${photoFiles[i].name.split('.').pop() || 'jpg'}`;
        await uploadFile(photoFiles[i], photoPath);
        const signedUrl = await getSignedUrl(photoPath);
        photoUrls.push(signedUrl);
      }

      // Create proof record
      const { data, error } = await supabase
        .from("sale_delivery_proofs")
        .insert({
          sale_id: saleId,
          trip_id: tripId || null,
          delivered_by: user.id,
          receiver_name: receiverName,
          receiver_position: receiverPosition || null,
          signature_storage_path: signaturePath,
          photo_urls: photoUrls,
          notes: notes || null,
          delivered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale-delivery-proof"] });
      queryClient.invalidateQueries({ queryKey: ["pending-deliveries"] });
      toast.success("Comprovante de entrega registrado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar entrega: " + error.message);
    },
  });

  return { createProof, getSignedUrl };
};
