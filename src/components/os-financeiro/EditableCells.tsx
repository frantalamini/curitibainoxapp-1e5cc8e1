import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Células editáveis estilo planilha (Excel):
 * - O campo já está sempre pronto pra digitar (sem modo-edição / botão confirmar).
 * - Salva automaticamente ao sair do campo (blur), Tab ou Enter.
 * - Escape descarta a edição e volta ao valor original.
 * - Só dispara o salvamento quando o valor realmente mudou.
 */

// Máscara dd/mm/aaaa enquanto digita
const maskDate = (value: string) => {
  const d = value.replace(/\D/g, "");
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
};

const isoToDisplay = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return isValid(d) ? format(d, "dd/MM/yyyy") : "";
};

interface EditableDateCellProps {
  /** Valor persistido no formato ISO yyyy-MM-dd */
  value: string;
  /** Chamado ao confirmar uma data válida, recebe ISO yyyy-MM-dd */
  onCommit: (nextIso: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EditableDateCell({
  value,
  onCommit,
  disabled,
  className,
}: EditableDateCellProps) {
  const [text, setText] = useState(() => isoToDisplay(value));

  // Resincroniza quando o valor persistido muda (ex.: após salvar ou regenerar)
  useEffect(() => setText(isoToDisplay(value)), [value]);

  const commit = () => {
    if (text === isoToDisplay(value)) return; // nada mudou
    const parsed = parse(text, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      onCommit(format(parsed, "yyyy-MM-dd"));
    } else {
      setText(isoToDisplay(value)); // data inválida -> reverte
    }
  };

  return (
    <Input
      inputMode="numeric"
      placeholder="dd/mm/aaaa"
      className={cn("h-7 text-xs px-1.5", className)}
      maxLength={10}
      disabled={disabled}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(maskDate(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setText(isoToDisplay(value));
          e.currentTarget.blur();
        }
      }}
    />
  );
}

interface EditableNumberCellProps {
  value: number;
  onCommit: (next: number) => void;
  disabled?: boolean;
  className?: string;
  step?: string;
  min?: string;
  placeholder?: string;
  /** Nº de casas decimais fixas para exibir e arredondar (ex.: 2 = R$). */
  decimals?: number;
}

export function EditableNumberCell({
  value,
  onCommit,
  disabled,
  className,
  step = "0.01",
  min = "0",
  placeholder,
  decimals,
}: EditableNumberCellProps) {
  const fmt = (n: number) =>
    decimals != null ? (n ?? 0).toFixed(decimals) : String(n ?? "");

  const [text, setText] = useState(() => fmt(value));

  useEffect(() => setText(fmt(value)), [value, decimals]);

  const commit = () => {
    const parsed = parseFloat(text.replace(",", "."));
    let next = isNaN(parsed) ? 0 : parsed;
    if (decimals != null) {
      const factor = 10 ** decimals;
      next = Math.round(next * factor) / factor;
    }
    if (next !== value) {
      onCommit(next);
    } else {
      setText(fmt(value)); // normaliza exibição
    }
  };

  return (
    <Input
      type="number"
      step={step}
      min={min}
      placeholder={placeholder}
      className={cn("h-7 text-xs text-right", className)}
      disabled={disabled}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setText(String(value ?? ""));
          e.currentTarget.blur();
        }
      }}
    />
  );
}

interface EditableTextCellProps {
  value: string;
  onCommit: (next: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  maxLength?: number;
}

export function EditableTextCell({
  value,
  onCommit,
  disabled,
  className,
  placeholder,
  maxLength,
}: EditableTextCellProps) {
  const [text, setText] = useState(() => value ?? "");

  useEffect(() => setText(value ?? ""), [value]);

  const commit = () => {
    if (text !== (value ?? "")) {
      onCommit(text);
    }
  };

  return (
    <Input
      type="text"
      placeholder={placeholder}
      className={cn("h-7 text-xs", className)}
      maxLength={maxLength}
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setText(value ?? "");
          e.currentTarget.blur();
        }
      }}
    />
  );
}
