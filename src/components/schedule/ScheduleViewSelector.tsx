import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, CalendarDays, CalendarClock } from "lucide-react";

export type ViewMode = "monthly" | "weekly" | "daily";

interface ScheduleViewSelectorProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

const ScheduleViewSelector = ({ value, onChange }: ScheduleViewSelectorProps) => {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ViewMode)}
      className="bg-muted p-1 rounded-lg"
    >
      <ToggleGroupItem
        value="monthly"
        aria-label="Visualização mensal"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
      >
        <Calendar className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Mensal</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="weekly"
        aria-label="Visualização semanal"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
      >
        <CalendarDays className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Semanal</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="daily"
        aria-label="Visualização diária"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
      >
        <CalendarClock className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Diária</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ScheduleViewSelector;
