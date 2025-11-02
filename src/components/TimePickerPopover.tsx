import * as React from "react";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerPopoverProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
}

export const TimePickerPopover = ({
  value,
  onChange,
  placeholder = "--:--",
}: TimePickerPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [tmpHour, setTmpHour] = useState<string | undefined>();
  const [tmpMinute, setTmpMinute] = useState<string | undefined>();

  // Pré-selecionar hora/minuto ao abrir se já houver valor
  useEffect(() => {
    if (open && value) {
      const [h, m] = value.split(":");
      if (h && m) {
        setTmpHour(h);
        setTmpMinute(m);
      }
    }
    if (!open) {
      // Limpar estado temporário ao fechar
      setTmpHour(undefined);
      setTmpMinute(undefined);
    }
  }, [open, value]);

  const handleHourClick = (hour: string) => {
    setTmpHour(hour);

    // Se já tiver minuto selecionado, fechar (suporta ordem inversa)
    if (tmpMinute) {
      const timeValue = `${hour}:${tmpMinute}`;
      onChange(timeValue);
      setOpen(false);
      setTmpHour(undefined);
      setTmpMinute(undefined);
    }
  };

  const handleMinuteClick = (minute: string) => {
    setTmpMinute(minute);

    // Só fechar se já tiver hora selecionada
    if (tmpHour) {
      const timeValue = `${tmpHour}:${minute}`;
      onChange(timeValue);
      setOpen(false);
      setTmpHour(undefined);
      setTmpMinute(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setTmpHour(undefined);
      setTmpMinute(undefined);
    }
    if (e.key === "Enter" && tmpHour && tmpMinute) {
      onChange(`${tmpHour}:${tmpMinute}`);
      setOpen(false);
      setTmpHour(undefined);
      setTmpMinute(undefined);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[150px] justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onKeyDown={handleKeyDown}
      >
        <div className="flex gap-2 p-2">
          {/* Coluna de HORAS */}
          <div className="flex flex-col">
            <div className="text-xs font-medium text-center mb-2 px-2">
              Hora
            </div>
            <ScrollArea className="h-[200px] w-[60px]">
              <div className="flex flex-col gap-1 p-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant={tmpHour === hour ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-full justify-center"
                    onClick={() => handleHourClick(hour)}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Coluna de MINUTOS */}
          <div className="flex flex-col">
            <div className="text-xs font-medium text-center mb-2 px-2">
              Minuto
            </div>
            <ScrollArea className="h-[200px] w-[60px]">
              <div className="flex flex-col gap-1 p-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant={tmpMinute === minute ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-full justify-center"
                    onClick={() => handleMinuteClick(minute)}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
