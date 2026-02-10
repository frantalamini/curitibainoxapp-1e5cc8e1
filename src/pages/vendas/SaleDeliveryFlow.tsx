import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, MapPin, Navigation, CheckCircle, Camera, Truck,
  ChevronRight, ArrowLeft, Pen,
} from "lucide-react";
import { useRouteGroupTrips, useSaleDeliveryTripsMutations, type SaleDeliveryTrip } from "@/hooks/useSaleDeliveryTrips";
import { useSaleDeliveryProofMutations } from "@/hooks/useSaleDeliveryProof";
import { StartTripModal } from "@/components/StartTripModal";
import { EndTripModal } from "@/components/EndTripModal";
import { MediaSlots } from "@/components/MediaSlots";
import { SignatureModal } from "@/components/SignatureModal";
import { formatDistance, buildAddressString } from "@/lib/geoUtils";
import { toast } from "sonner";

type FlowStep = "overview" | "delivering" | "proof";

export default function SaleDeliveryFlow() {
  const { routeGroupId } = useParams<{ routeGroupId: string }>();
  const navigate = useNavigate();
  const { data: trips, isLoading } = useRouteGroupTrips(routeGroupId);
  const { startTrip, finishTrip } = useSaleDeliveryTripsMutations();
  const { createProof } = useSaleDeliveryProofMutations();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<FlowStep>("overview");
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Proof form state
  const [receiverName, setReceiverName] = useState("");
  const [receiverPosition, setReceiverPosition] = useState("");
  const [notes, setNotes] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const currentTrip = trips?.[currentIndex];
  const totalTrips = trips?.length || 0;

  const completedCount = useMemo(() =>
    trips?.filter(t => t.status === "concluido").length || 0
  , [trips]);

  const clientAddress = useMemo(() => {
    const client = currentTrip?.sales?.clients;
    if (!client) return undefined;
    return {
      street: client.street,
      number: client.number,
      neighborhood: client.neighborhood,
      city: client.city,
      state: client.state,
      cep: client.cep,
    };
  }, [currentTrip]);

  // Auto-advance to next pending trip on mount/data change
  useMemo(() => {
    if (!trips?.length) return;
    // Find first non-completed trip
    const idx = trips.findIndex(t => t.status !== "concluido");
    if (idx >= 0 && idx !== currentIndex) {
      setCurrentIndex(idx);
    }
  }, [trips]);

  const handleStartTrip = async (data: {
    vehicleId: string;
    originLat: number;
    originLng: number;
    destinationLat: number | null;
    destinationLng: number | null;
    estimatedDistanceKm: number | null;
  }) => {
    if (!currentTrip) return;
    setShowStartModal(false);

    await startTrip.mutateAsync({
      id: currentTrip.id,
      origin_lat: data.originLat,
      origin_lng: data.originLng,
    });

    setStep("delivering");

    // Open Google Maps navigation
    const client = currentTrip.sales?.clients;
    if (client) {
      const addr = buildAddressString({
        street: client.street,
        number: client.number,
        neighborhood: client.neighborhood,
        city: client.city,
        state: client.state,
        cep: client.cep,
      });
      if (addr) {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
        // Use location.href for iOS PWA compatibility
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.location.href = mapsUrl;
        } else {
          window.open(mapsUrl, "_blank");
        }
      }
    }
  };

  const handleEndTrip = async (endOdometer: number | null) => {
    if (!currentTrip) return;
    setShowEndModal(false);

    await finishTrip.mutateAsync({
      id: currentTrip.id,
      distance_km: currentTrip.estimated_distance_km || undefined,
    });

    setStep("proof");
  };

  const handleSaveProof = async () => {
    if (!currentTrip) return;
    if (!receiverName.trim()) {
      toast.error("Informe o nome de quem recebeu");
      return;
    }
    if (!signatureData) {
      toast.error("Colete a assinatura do recebedor");
      return;
    }

    setIsSaving(true);
    try {
      await createProof.mutateAsync({
        saleId: currentTrip.sale_id,
        tripId: currentTrip.id,
        receiverName: receiverName.trim(),
        receiverPosition: receiverPosition.trim() || undefined,
        signatureDataUrl: signatureData,
        photoFiles,
        notes: notes.trim() || undefined,
      });

      // Reset proof form
      setReceiverName("");
      setReceiverPosition("");
      setNotes("");
      setSignatureData(null);
      setPhotoFiles([]);

      // Move to next trip or finish
      const nextIdx = currentIndex + 1;
      if (nextIdx < totalTrips) {
        setCurrentIndex(nextIdx);
        setStep("overview");
        toast.success("Entrega registrada! Próxima parada...");
      } else {
        toast.success("Todas as entregas concluídas! 🎉");
        navigate("/vendas/entregas");
      }
    } catch {
      // error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!trips?.length) {
    return (
      <MainLayout>
        <div className="container max-w-lg mx-auto p-4 text-center py-12">
          <p className="text-muted-foreground">Rota não encontrada</p>
          <Button className="mt-4" onClick={() => navigate("/vendas/entregas")}>
            Voltar
          </Button>
        </div>
      </MainLayout>
    );
  }

  const client = currentTrip?.sales?.clients;
  const address = client ? buildAddressString({
    street: client.street,
    number: client.number,
    neighborhood: client.neighborhood,
    city: client.city,
    state: client.state,
    cep: client.cep,
  }) : "";

  return (
    <MainLayout>
      <div className="container max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vendas/entregas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Rota de Entregas
            </h1>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{totalTrips} concluídas
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1">
          {trips.map((trip, idx) => (
            <div
              key={trip.id}
              className={`h-2 flex-1 rounded-full transition-colors ${
                trip.status === "concluido"
                  ? "bg-green-500"
                  : idx === currentIndex
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Current delivery card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Entrega {currentIndex + 1} de {totalTrips}
              </CardTitle>
              <Badge variant={
                currentTrip?.status === "concluido" ? "default" :
                currentTrip?.status === "em_deslocamento" ? "secondary" : "outline"
              }>
                {currentTrip?.status === "concluido" ? "Concluído" :
                 currentTrip?.status === "em_deslocamento" ? "Em Deslocamento" : "Pendente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">
                Venda #{currentTrip?.sales?.sale_number}
              </span>
              <span className="font-bold text-primary">
                {currentTrip?.sales?.total
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(currentTrip.sales.total)
                  : ""}
              </span>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{client?.full_name || "—"}</span>
              </div>
              {address && (
                <p className="text-muted-foreground ml-5">{address}</p>
              )}
            </div>
            {currentTrip?.estimated_distance_km && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Navigation className="h-3.5 w-3.5" />
                <span>~{formatDistance(currentTrip.estimated_distance_km)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions based on step */}
        {step === "overview" && currentTrip?.status === "pending" && (
          <Button className="w-full" size="lg" onClick={() => setShowStartModal(true)}>
            <Navigation className="h-5 w-5 mr-2" />
            Iniciar Deslocamento
          </Button>
        )}

        {(step === "delivering" || currentTrip?.status === "em_deslocamento") && (
          <Button className="w-full" size="lg" onClick={() => setShowEndModal(true)}>
            <MapPin className="h-5 w-5 mr-2" />
            Cheguei no Cliente
          </Button>
        )}

        {step === "proof" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Comprovante de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photos */}
              <MediaSlots
                mode="after"
                maxPhotos={5}
                maxVideos={0}
                photoFiles={photoFiles}
                videoFile={null}
                existingPhotoUrls={[]}
                existingVideoUrl={null}
                onPhotoFilesChange={setPhotoFiles}
                onVideoFileChange={() => {}}
                onExistingPhotoUrlsChange={() => {}}
                onExistingVideoUrlChange={() => {}}
              />

              {/* Receiver info */}
              <div className="space-y-2">
                <Label htmlFor="receiver-name">Nome de quem recebeu *</Label>
                <Input
                  id="receiver-name"
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiver-position">Cargo / Função</Label>
                <Input
                  id="receiver-position"
                  value={receiverPosition}
                  onChange={e => setReceiverPosition(e.target.value)}
                  placeholder="Ex: Porteiro, Gerente..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observações da entrega..."
                  rows={2}
                />
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label>Assinatura do Recebedor *</Label>
                {signatureData ? (
                  <div className="border rounded-lg p-2 bg-white">
                    <img src={signatureData} alt="Assinatura" className="max-h-24 mx-auto" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setShowSignatureModal(true)}
                    >
                      <Pen className="h-3.5 w-3.5 mr-1.5" />
                      Refazer Assinatura
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSignatureModal(true)}
                  >
                    <Pen className="h-4 w-4 mr-2" />
                    Coletar Assinatura
                  </Button>
                )}
              </div>

              {/* Save */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleSaveProof}
                disabled={isSaving || !receiverName.trim() || !signatureData}
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                {currentIndex + 1 < totalTrips ? "Salvar e Próxima Entrega" : "Finalizar Entrega"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Route overview (mini list) */}
        {totalTrips > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Sequência da Rota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {trips.map((trip, idx) => (
                <div
                  key={trip.id}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    idx === currentIndex ? "bg-primary/10 font-medium" : ""
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    trip.status === "concluido"
                      ? "bg-green-500 text-white"
                      : idx === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {trip.status === "concluido" ? "✓" : idx + 1}
                  </span>
                  <span className="flex-1 truncate">
                    {trip.sales?.clients?.full_name || `Venda #${trip.sales?.sale_number}`}
                  </span>
                  {trip.estimated_distance_km && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistance(trip.estimated_distance_km)}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <StartTripModal
          open={showStartModal}
          onOpenChange={setShowStartModal}
          onConfirm={handleStartTrip}
          clientAddress={clientAddress}
          isLoading={startTrip.isPending}
        />

        <EndTripModal
          open={showEndModal}
          onOpenChange={setShowEndModal}
          onConfirm={handleEndTrip}
          startOdometer={0}
          estimatedDistanceKm={currentTrip?.estimated_distance_km}
          isLoading={finishTrip.isPending}
        />

        <SignatureModal
          open={showSignatureModal}
          title="Assinatura do Recebedor"
          showExtraFields={false}
          onCancel={() => setShowSignatureModal(false)}
          onSave={(data) => {
            setSignatureData(data);
            setShowSignatureModal(false);
          }}
        />
      </div>
    </MainLayout>
  );
}
