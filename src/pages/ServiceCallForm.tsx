import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useServiceCalls, ServiceCallInsert } from "@/hooks/useServiceCalls";
import { useServiceTypes } from "@/hooks/useServiceTypes";

const ServiceCallForm = () => {
  const navigate = useNavigate();
  const { clients, isLoading: clientsLoading } = useClients();
  const { technicians, isLoading: techniciansLoading } = useTechnicians();
  const { serviceTypes, isLoading: serviceTypesLoading } = useServiceTypes();
  const { createServiceCall } = useServiceCalls();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [manualDate, setManualDate] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceCallInsert>();

  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const activeTechnicians = technicians?.filter((t) => t.active);
  const activeServiceTypes = serviceTypes?.filter((st) => st.active);

  const onSubmit = async (data: ServiceCallInsert) => {
    if (!selectedDate) {
      return;
    }

    const formattedData = {
      ...data,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
    };

    createServiceCall(formattedData);
    navigate("/service-calls");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Novo Chamado Técnico</h1>
          <p className="text-muted-foreground">Criar novo chamado de serviço</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Informações do Chamado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select
                  disabled={clientsLoading}
                  value={selectedClientId}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setValue("client_id", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client_id && (
                  <p className="text-sm text-destructive">Cliente é obrigatório</p>
                )}

                {selectedClient && (
                  <Card className="mt-2">
                    <CardContent className="pt-4 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Nome:</span> {selectedClient.full_name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Telefone:</span> {selectedClient.phone}
                      </p>
                      {selectedClient.address && (
                        <p className="text-sm">
                          <span className="font-medium">Endereço:</span>{" "}
                          {selectedClient.street && `${selectedClient.street}, `}
                          {selectedClient.number && `${selectedClient.number}, `}
                          {selectedClient.neighborhood && `${selectedClient.neighborhood}, `}
                          {selectedClient.city && `${selectedClient.city} - `}
                          {selectedClient.state}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Equipamento */}
              <div className="space-y-2">
                <Label htmlFor="equipment_description">Equipamento *</Label>
                <Input
                  id="equipment_description"
                  placeholder="Descreva o equipamento"
                  {...register("equipment_description", { required: true })}
                />
                {errors.equipment_description && (
                  <p className="text-sm text-destructive">Equipamento é obrigatório</p>
                )}
              </div>

              {/* Tipo de Chamado */}
              <div className="space-y-2">
                <Label htmlFor="service_type">Tipo de Chamado *</Label>
                <Select
                  disabled={serviceTypesLoading}
                  value={selectedServiceTypeId}
                  onValueChange={(value) => {
                    setSelectedServiceTypeId(value);
                    setValue("service_type_id", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de chamado" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServiceTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.service_type_id && (
                  <p className="text-sm text-destructive">Tipo de chamado é obrigatório</p>
                )}
              </div>

              {/* Técnico */}
              <div className="space-y-2">
                <Label htmlFor="technician">Técnico Responsável *</Label>
                <Select
                  disabled={techniciansLoading}
                  value={selectedTechnicianId}
                  onValueChange={(value) => {
                    setSelectedTechnicianId(value);
                    setValue("technician_id", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTechnicians?.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.full_name}
                        {tech.specialty_cooking && " - Cocção"}
                        {tech.specialty_refrigeration && " - Refrigeração"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.technician_id && (
                  <p className="text-sm text-destructive">Técnico é obrigatório</p>
                )}
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label>Data do Agendamento *</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          if (date) {
                            setManualDate(format(date, "dd/MM/yyyy"));
                          }
                          // Fechar o popover
                          setTimeout(() => document.body.click(), 0);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    className="w-32"
                    value={manualDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      let masked = value.replace(/\D/g, "");
                      
                      if (masked.length >= 2) {
                        masked = masked.slice(0, 2) + "/" + masked.slice(2);
                      }
                      if (masked.length >= 5) {
                        masked = masked.slice(0, 5) + "/" + masked.slice(5, 9);
                      }
                      
                      setManualDate(masked);
                      
                      if (masked.length === 10) {
                        const [day, month, year] = masked.split("/").map(Number);
                        const date = new Date(year, month - 1, day);
                        if (!isNaN(date.getTime()) && day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                          setSelectedDate(date);
                        }
                      }
                    }}
                    maxLength={10}
                  />
                </div>
                {!selectedDate && (
                  <p className="text-sm text-destructive">Data é obrigatória</p>
                )}
              </div>

              {/* Horário */}
              <div className="space-y-2">
                <Label htmlFor="scheduled_time">Horário *</Label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    className="flex-1"
                    value={selectedTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedTime(value);
                      setValue("scheduled_time", value);
                    }}
                  />
                  
                  <Input
                    type="text"
                    placeholder="HH:MM"
                    className="w-24"
                    value={selectedTime}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + ":" + value.slice(2, 4);
                      }
                      
                      if (value.length === 5) {
                        const [hours, minutes] = value.split(":").map(Number);
                        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                          setSelectedTime(value);
                          setValue("scheduled_time", value);
                        }
                      } else if (value.length < 5) {
                        setSelectedTime(value);
                      }
                    }}
                    maxLength={5}
                  />
                </div>
                {errors.scheduled_time && (
                  <p className="text-sm text-destructive">Horário é obrigatório</p>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais sobre o chamado"
                  {...register("notes")}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 mt-6">
            <Button type="submit">Criar Chamado</Button>
            <Button type="button" variant="outline" onClick={() => navigate("/service-calls")}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ServiceCallForm;
