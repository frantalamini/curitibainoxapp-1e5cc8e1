import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

interface ArrivalDetectionBannerProps {
  countdownSeconds: number;
  onConfirm: () => void;
  onDismiss: () => void;
}

function formatCountdown(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export const ArrivalDetectionBanner = ({
  countdownSeconds,
  onConfirm,
  onDismiss,
}: ArrivalDetectionBannerProps) => {
  return (
    <Alert className="border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950">
      <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertDescription className="text-green-800 dark:text-green-200">
        <div className="space-y-3">
          <div>
            <p className="font-medium">
              Você está próximo do cliente. Confirmar chegada?
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Chegada será registrada automaticamente em{" "}
              {formatCountdown(countdownSeconds)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onConfirm}>
              <MapPin className="mr-1 h-3 w-3" />
              Confirmar Chegada
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Ainda não cheguei
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
