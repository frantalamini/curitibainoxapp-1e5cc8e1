import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export const PasswordStrengthIndicator = ({ password, className }: PasswordStrengthIndicatorProps) => {
  const checks = [
    {
      label: "Mínimo 8 caracteres",
      valid: password.length >= 8,
    },
    {
      label: "Pelo menos uma letra maiúscula (A-Z)",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "Pelo menos um caractere especial (!@#$%...)",
      valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];

  const allValid = checks.every((check) => check.valid);
  const someValid = checks.some((check) => check.valid);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              allValid ? "bg-green-500 w-full" : someValid ? "bg-yellow-500 w-1/2" : "bg-red-500 w-1/4"
            )}
          />
        </div>
        <span className="text-sm font-medium">
          {allValid ? "Forte" : someValid ? "Média" : "Fraca"}
        </span>
      </div>
      <div className="space-y-1">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {check.valid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={cn(check.valid ? "text-foreground" : "text-muted-foreground")}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
