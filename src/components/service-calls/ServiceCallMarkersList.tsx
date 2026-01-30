import { Tag } from "lucide-react";
import type { ServiceCallMarker } from "@/hooks/useServiceCallMarkers";

interface ServiceCallMarkersListProps {
  markers: ServiceCallMarker[];
  maxVisible?: number;
}

export function ServiceCallMarkersList({ markers, maxVisible = 2 }: ServiceCallMarkersListProps) {
  if (!markers || markers.length === 0) return null;

  const visibleMarkers = markers.slice(0, maxVisible);
  const hiddenCount = markers.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleMarkers.map((marker) => (
        <div
          key={marker.id}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground max-w-[150px]"
          title={marker.text}
        >
          <Tag className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{marker.text}</span>
        </div>
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground px-1">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
