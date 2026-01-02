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
      className="bg-muted p-1 rounded-lg flex-wrap"
    >
      <ToggleGroupItem
        value="monthly"
        aria-label="Visualização mensal"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap"
      >
        <Calendar className="h-4 w-4 sm:mr-2" />
        <span className="ml-1 sm:ml-0">Mensal</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="weekly"
        aria-label="Visualização semanal"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap"
      >
        <CalendarDays className="h-4 w-4 sm:mr-2" />
        <span className="ml-1 sm:ml-0">Semanal</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="daily"
        aria-label="Visualização diária"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap"
      >
        <CalendarClock className="h-4 w-4 sm:mr-2" />
        <span className="ml-1 sm:ml-0">Diário</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ScheduleViewSelector;
