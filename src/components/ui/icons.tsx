import React from "react";
import {
  ClipboardList,
  Building2,
  Calendar,
  Wrench,
  BarChart3,
  DollarSign,
  Settings,
  MapPin,
  Navigation,
  Bell,
  User,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  Save,
  Upload,
  Download,
  Users,
  Package,
  FileText,
  Activity,
  Tags,
  Shield,
  Car,
  FileCheck,
  LogOut,
  Menu,
  X,
  MoreVertical,
  Eye,
  Phone,
  Mail,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  AlertTriangle,
  Info,
  Home,
  Palette,
  ShoppingCart,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icon mapping with semantic names in Portuguese
export const IconMap = {
  // Main Navigation
  chamadosTecnicos: ClipboardList,
  clientesFornecedores: Building2,
  agenda: Calendar,
  equipamentos: Package,
  relatorios: BarChart3,
  financeiro: DollarSign,
  configuracoes: Settings,
  
  // Location & Map
  gps: MapPin,
  mapa: Navigation,
  
  // Actions
  mais: Plus,
  voltar: ArrowLeft,
  editar: Pencil,
  excluir: Trash2,
  salvar: Save,
  upload: Upload,
  download: Download,
  
  // System
  notificacoes: Bell,
  usuario: User,
  usuarios: Users,
  sair: LogOut,
  menu: Menu,
  fechar: X,
  maisOpcoes: MoreVertical,
  visualizar: Eye,
  
  // Communication
  telefone: Phone,
  email: Mail,
  
  // UI
  buscar: Search,
  direita: ChevronRight,
  esquerda: ChevronLeft,
  baixo: ChevronDown,
  cima: ChevronUp,
  check: Check,
  
  // Status
  relogio: Clock,
  alerta: AlertTriangle,
  info: Info,
  
  // Additional
  home: Home,
  servicos: Wrench,
  produtos: Package,
  documentos: FileText,
  atividade: Activity,
  categorias: Tags,
  seguranca: Shield,
  veiculo: Car,
  checklist: FileCheck,
  paleta: Palette,
  carrinho: ShoppingCart,
} as const;

export type IconName = keyof typeof IconMap;

// Size variants
const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  "2xl": "h-10 w-10",
} as const;

// Color variants using design system tokens
const colorClasses = {
  primary: "text-primary",
  muted: "text-muted-foreground",
  foreground: "text-foreground",
  success: "text-green-600",
  destructive: "text-destructive",
  warning: "text-amber-500",
  info: "text-blue-500",
  current: "text-current",
  white: "text-white",
} as const;

export type IconSize = keyof typeof sizeClasses;
export type IconColor = keyof typeof colorClasses;
export type IconVariant = "outlined" | "filled";

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
  size?: IconSize;
  color?: IconColor;
  variant?: IconVariant;
  className?: string;
}

/**
 * Icon component with consistent styling for Curitiba Inox Design System
 * 
 * @example
 * // Basic usage
 * <Icon name="chamadosTecnicos" />
 * 
 * // With size and color
 * <Icon name="editar" size="sm" color="primary" />
 * 
 * // Filled variant (with background)
 * <Icon name="agenda" variant="filled" />
 */
export const Icon = ({
  name,
  size = "md",
  color = "current",
  variant = "outlined",
  className,
  ...props
}: IconProps) => {
  const IconComponent = IconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in IconMap`);
    return null;
  }

  const iconElement = (
    <IconComponent
      className={cn(
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      {...props}
    />
  );

  if (variant === "filled") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-primary/10",
          size === "xs" && "p-1",
          size === "sm" && "p-1.5",
          size === "md" && "p-2",
          size === "lg" && "p-2.5",
          size === "xl" && "p-3",
          size === "2xl" && "p-4"
        )}
      >
        {iconElement}
      </div>
    );
  }

  return iconElement;
};

/**
 * Direct access to icon components for advanced usage
 * 
 * @example
 * import { Icons } from "@/components/ui/icons";
 * <Icons.chamadosTecnicos className="h-6 w-6 text-primary" />
 */
export const Icons = IconMap;

/**
 * Get icon component by name (useful for dynamic rendering)
 */
export const getIcon = (name: IconName): LucideIcon => IconMap[name];

export default Icon;
