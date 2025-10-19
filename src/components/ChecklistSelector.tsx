import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChecklistItem } from "@/hooks/useChecklists";

interface ChecklistSelectorProps {
  items: ChecklistItem[];
  onChange: (responses: Record<string, boolean>) => void;
  initialResponses?: Record<string, boolean>;
}

export const ChecklistSelector = ({ items, onChange, initialResponses = {} }: ChecklistSelectorProps) => {
  const [responses, setResponses] = useState<Record<string, boolean>>(initialResponses);

  useEffect(() => {
    setResponses(initialResponses);
  }, [initialResponses]);

  const handleCheck = (itemId: string, checked: boolean) => {
    const newResponses = { ...responses, [itemId]: checked };
    setResponses(newResponses);
    onChange(newResponses);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de Verificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox
              id={item.id}
              checked={responses[item.id] || false}
              onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
            />
            <Label htmlFor={item.id} className="text-sm cursor-pointer">
              {item.text}
              {item.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
