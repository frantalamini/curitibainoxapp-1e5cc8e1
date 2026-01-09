import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useHomeStats } from "@/hooks/useHomeStats";
import { useTechnicianHomeStats } from "@/hooks/useTechnicianHomeStats";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentTechnician } from "@/hooks/useCurrentTechnician";
import { useOpenTripsMap, useServiceCallTripsMutations } from "@/hooks/useServiceCallTrips";
import { Icon, type IconName } from "@/components/ui/icons";
import { TodayCallsPreview } from "./TodayCallsPreview";
import { StartTripModal } from "@/components/StartTripModal";
import { EndTripModal } from "@/components/EndTripModal";
import { useOpenTrip } from "@/hooks/useServiceCallTrips";
import defaultLogo from "@/assets/logo.png";
import { getTodayLocalDate } from "@/lib/dateUtils";

interface NavItem {
  icon: IconName;
  label: string;
  path: string;
  angle: number;
}

interface QuickStatCardProps {
  label: string;
  value?: number;
  icon: IconName;
  color?: "primary" | "destructive" | "success";
  onClick: () => void;
}

interface TripModalState {
  isOpen: boolean;
  serviceCallId: string | null;
}

const MobileHome = () => {
  const navigate = useNavigate();
  const { settings } = useSystemSettings();
  const { isTechnician } = useUserRole();
  const { technicianId } = useCurrentTechnician();
  
  // Use stats filtradas para técnicos
  const { data: globalStats, isLoading: isLoadingGlobal } = useHomeStats();
  const { data: technicianStats, isLoading: isLoadingTech } = useTechnicianHomeStats();
  
  // Usar stats do técnico se for técnico, senão usar global
  const stats = isTechnician ? technicianStats : globalStats;
  const isLoading = isTechnician ? isLoadingTech : isLoadingGlobal;

  // Get today's date in local timezone
  const today = getTodayLocalDate();
  
  // Get today's calls IDs for batch trip lookup
  const todayCallsIds = stats?.upcomingCalls
    ?.filter(c => c.scheduled_date === today)
    .map(c => c.id) || [];
  
  const { data: openTripsMap = {} } = useOpenTripsMap(todayCallsIds);

  // Trip modals state
  const [startTripModal, setStartTripModal] = useState<TripModalState>({ isOpen: false, serviceCallId: null });
  const [endTripModal, setEndTripModal] = useState<TripModalState>({ isOpen: false, serviceCallId: null });

  // Get open trip for the end modal
  const { data: openTrip } = useOpenTrip(endTripModal.serviceCallId || undefined);

  // Trip mutations
  const { createTrip, updateTrip, isCreating, isUpdating } = useServiceCallTripsMutations();
  
  const logoUrl = settings?.logo_url || defaultLogo;

  const navItems: NavItem[] = [
    { icon: "chamadosTecnicos", label: "Chamados", path: "/service-calls", angle: 0 },
    { icon: "clientesFornecedores", label: "Clientes", path: "/cadastros/clientes", angle: 60 },
    { icon: "agenda", label: "Agenda", path: "/schedule", angle: 120 },
    { icon: "equipamentos", label: "Equipamentos", path: "/equipment", angle: 180 },
    { icon: "relatorios", label: "Relatórios", path: "/dashboard", angle: 240 },
    { icon: "financeiro", label: "Financeiro", path: "/financeiro", angle: 300 },
  ];

  const getPosition = (angle: number, radius: number) => {
    const radian = (angle - 90) * (Math.PI / 180);
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;
    return { x, y };
  };

  const circleRadius = 120;

  // Today's calls for preview (already have `today` from above)
  const todayCalls = (stats?.upcomingCalls || [])
    .filter(c => c.scheduled_date === today)
    .map(c => ({
      id: c.id,
      os_number: c.os_number,
      scheduled_time: c.scheduled_time,
      scheduled_date: c.scheduled_date,
      client_name: c.client_name,
      equipment_description: c.equipment_description,
    }));

  // Upcoming calls (next 7 days, excluding today)
  const upcomingCalls = (stats?.upcomingCalls || [])
    .filter(c => c.scheduled_date > today)
    .map(c => ({
      id: c.id,
      os_number: c.os_number,
      scheduled_time: c.scheduled_time,
      scheduled_date: c.scheduled_date,
      client_name: c.client_name,
      equipment_description: c.equipment_description,
    }));

  const handleOpenOS = (id: string) => {
    navigate(`/service-calls?open=${id}`);
  };

  const handleStartTrip = (id: string) => {
    setStartTripModal({ isOpen: true, serviceCallId: id });
  };

  const handleEndTrip = (id: string) => {
    setEndTripModal({ isOpen: true, serviceCallId: id });
  };

  const handleConfirmStartTrip = (vehicleId: string) => {
    if (!startTripModal.serviceCallId || !technicianId) return;

    createTrip({
      service_call_id: startTripModal.serviceCallId,
      technician_id: technicianId,
      vehicle_id: vehicleId,
      start_odometer_km: 0, // Will be updated by the modal in future
      status: "em_deslocamento",
    });

    setStartTripModal({ isOpen: false, serviceCallId: null });
  };

  const handleConfirmEndTrip = (endOdometer: number | null) => {
    if (!openTrip) return;

    updateTrip({
      id: openTrip.id,
      updates: {
        finished_at: new Date().toISOString(),
        end_odometer_km: endOdometer || undefined,
        distance_km: endOdometer ? endOdometer - openTrip.start_odometer_km : undefined,
        status: "concluido",
      },
    });

    setEndTripModal({ isOpen: false, serviceCallId: null });
  };

  return (
    <div className="mobile-layout bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header with Safe Area */}
      <header 
        className="pb-4 px-6"
        style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))' }}
      >
        <h1 className="text-lg font-semibold text-foreground text-center">
          Curitiba Inox
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-0.5">
          Assistência Técnica
        </p>
      </header>

      {/* Main Navigation Circle */}
      <main 
        className="flex-1 flex flex-col items-center justify-start px-6 overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div 
          className="relative"
          style={{ 
            width: circleRadius * 2 + 100, 
            height: circleRadius * 2 + 100 
          }}
        >
          {/* Subtle gradient ring */}
          <div 
            className="absolute rounded-full bg-gradient-to-br from-primary/5 via-transparent to-primary/10"
            style={{
              width: circleRadius * 2 + 90,
              height: circleRadius * 2 + 90,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />

          {/* Center Logo with Glass-morphism */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-28 h-28 rounded-full bg-white/90 backdrop-blur-sm shadow-elevated border border-primary/10 flex items-center justify-center p-4 overflow-hidden">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Navigation Items */}
          {navItems.map((item, index) => {
            const pos = getPosition(item.angle, circleRadius);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="absolute flex flex-col items-center justify-center transition-all duration-200 active:scale-95 group animate-fade-in opacity-0"
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${index * 80}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <div className="w-14 h-14 rounded-2xl bg-card/95 backdrop-blur-sm shadow-card border border-border/50 flex items-center justify-center text-primary group-hover:shadow-card-hover group-hover:border-primary/40 group-active:bg-primary/5 transition-all duration-200">
                  <Icon name={item.icon} size="lg" color="primary" />
                </div>
                <span className="mt-1.5 text-xs font-medium text-foreground/80 group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary CTA Button */}
        <div className="w-full max-w-sm mt-4 px-4 animate-fade-in opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <Button 
            onClick={() => navigate("/service-calls/new")}
            className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl gap-2"
            size="lg"
          >
            <Icon name="mais" size="md" color="white" />
            Abrir novo chamado
          </Button>
        </div>

        {/* Quick Stats Cards */}
        <div className="w-full max-w-sm mt-4 px-4 animate-fade-in opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
          <div className="grid grid-cols-3 gap-3">
            <QuickStatCard 
              label="Pendentes" 
              value={stats?.openCallsCount}
              icon="chamadosTecnicos"
              color="primary"
              onClick={() => navigate("/service-calls")} 
            />
            <QuickStatCard 
              label="Hoje" 
              value={stats?.todayCallsCount}
              icon="agenda"
              color="success"
              onClick={() => navigate("/schedule")} 
            />
            <QuickStatCard 
              label="Em Atraso" 
              value={stats?.overdueCallsCount}
              icon="alerta"
              color="destructive"
              onClick={() => navigate("/service-calls")} 
            />
          </div>
        </div>

        {/* Today's Calls Preview - only for technicians */}
        {isTechnician && (
          <div className="w-full max-w-sm mt-4 px-4 animate-fade-in opacity-0" style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}>
            <TodayCallsPreview
              calls={todayCalls}
              upcomingCalls={upcomingCalls}
              openTripsMap={openTripsMap}
              onOpenOS={handleOpenOS}
              onStartTrip={handleStartTrip}
              onEndTrip={handleEndTrip}
              isLoading={isLoading}
            />
          </div>
        )}
      </main>

      {/* Start Trip Modal */}
      <StartTripModal
        open={startTripModal.isOpen}
        onOpenChange={(open) => setStartTripModal({ isOpen: open, serviceCallId: open ? startTripModal.serviceCallId : null })}
        onConfirm={handleConfirmStartTrip}
        isLoading={isCreating}
      />

      {/* End Trip Modal */}
      {openTrip && (
        <EndTripModal
          open={endTripModal.isOpen}
          onOpenChange={(open) => setEndTripModal({ isOpen: open, serviceCallId: open ? endTripModal.serviceCallId : null })}
          onConfirm={handleConfirmEndTrip}
          startOdometer={openTrip.start_odometer_km}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
};

const QuickStatCard = ({ label, value, icon, color = "primary", onClick }: QuickStatCardProps) => {
  const colorClasses = {
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-green-600"
  };

  return (
    <button
      onClick={onClick}
      className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 text-center hover:border-primary/30 hover:shadow-card transition-all duration-200 active:scale-95 flex flex-col items-center gap-1"
    >
      <Icon name={icon} size="sm" color={color} />
      <span className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value ?? '-'}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </button>
  );
};

export default MobileHome;
