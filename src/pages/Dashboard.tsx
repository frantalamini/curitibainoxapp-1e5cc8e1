import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Users, ClipboardList, Wrench, TrendingUp, X, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import MainLayout from "@/components/MainLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useTechnicians } from "@/hooks/useTechnicians";
import { cn } from "@/lib/utils";
import { generateDashboardReport } from "@/lib/dashboardPdfGenerator";
import { toast } from "sonner";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#A4DE6C", "#D0ED57"];

const TECHNICIAN_COLORS: Record<string, string> = {
  "José": "#15803d",      // Verde escuro (melhor contraste)
  "Anderson": "#fbbf24",  // Amarelo (parametrizado)
  "Matheus": "#3b82f6",   // Azul
};

const getTechnicianColor = (name: string, fallbackIndex: number): string => {
  return TECHNICIAN_COLORS[name] || COLORS[fallbackIndex % COLORS.length];
};

const Dashboard = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedTechnician, setSelectedTechnician] = useState<string>();

  const statusChartRef = useRef<HTMLDivElement>(null);
  const technicianChartRef = useRef<HTMLDivElement>(null);
  const serviceTypeChartRef = useRef<HTMLDivElement>(null);
  const equipmentChartRef = useRef<HTMLDivElement>(null);
  const topClientsChartRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useDashboardData(startDate, endDate, selectedTechnician);
  const { technicians } = useTechnicians();

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedTechnician(undefined);
  };

  const handleExportPdf = async () => {
    if (!statusChartRef.current || !technicianChartRef.current || 
        !serviceTypeChartRef.current || !equipmentChartRef.current || 
        !topClientsChartRef.current) {
      toast.error("Aguarde os gráficos carregarem completamente");
      return;
    }

    try {
      toast.loading("Gerando PDF do dashboard...");

      // Buscar nome do técnico se filtro aplicado
      let technicianName: string | undefined;
      if (selectedTechnician) {
        const tech = technicians?.find(t => t.id === selectedTechnician);
        technicianName = tech?.full_name;
      }

      const pdf = await generateDashboardReport(
        {
          totalClients: data?.totalClients || 0,
          totalCalls: data?.totalCalls || 0,
          totalEquipment: data?.totalEquipment || 0,
          completionRate: data?.completionRate || 0,
          startDate,
          endDate,
          technicianName,
        },
        {
          statusChart: statusChartRef.current,
          technicianChart: technicianChartRef.current,
          serviceTypeChart: serviceTypeChartRef.current,
          equipmentChart: equipmentChartRef.current,
          topClientsChart: topClientsChartRef.current,
        }
      );

      const fileName = `dashboard-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss();
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.dismiss();
      toast.error("Erro ao gerar PDF do dashboard");
    }
  };

  const statusData = [
    { name: "Pendente", value: data?.calls.filter((c: any) => c.status === "pending").length || 0, color: "#fbbf24" },
    { name: "Em Andamento", value: data?.calls.filter((c: any) => c.status === "in_progress").length || 0, color: "#3b82f6" },
    { name: "Com Pendências", value: data?.calls.filter((c: any) => c.status === "on_hold").length || 0, color: "#f97316" },
    { name: "Finalizado", value: data?.calls.filter((c: any) => c.status === "completed").length || 0, color: "#22c55e" },
  ].filter(item => item.value > 0);

  const technicianData = Object.entries(
    data?.calls.reduce((acc: any, call: any) => {
      const techName = call.technicians?.full_name || "Sem técnico";
      acc[techName] = (acc[techName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {}
  ).map(([name, value], index) => ({ 
    name, 
    value: value as number, 
    color: getTechnicianColor(name, index)
  }));

  const serviceTypeData = Object.entries(
    data?.calls.reduce((acc: any, call: any) => {
      const typeName = call.service_types?.name || "Sem tipo";
      const typeColor = call.service_types?.color || "#cccccc";
      if (!acc[typeName]) {
        acc[typeName] = { count: 0, color: typeColor };
      }
      acc[typeName].count++;
      return acc;
    }, {} as Record<string, { count: number; color: string }>) || {}
  ).map(([name, data]) => {
    const typedData = data as { count: number; color: string };
    return { name, value: typedData.count, color: typedData.color };
  });

  const equipmentData = Object.entries(
    data?.calls.reduce((acc: any, call: any) => {
      const equipment = call.equipment_description || "Sem descrição";
      acc[equipment] = (acc[equipment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {}
  )
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([name, value], index) => ({ name, value: value as number, color: COLORS[index % COLORS.length] }));

  const clientData = Object.entries(
    data?.calls.reduce((acc: any, call: any) => {
      const clientName = call.clients?.full_name || "Sem cliente";
      acc[clientName] = (acc[clientName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {}
  )
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([name, value], index) => ({ 
      name, 
      value: value as number, 
      color: COLORS[index % COLORS.length] 
    }));

  const metricsCards = [
    {
      title: "Clientes Atendidos",
      value: data?.totalClients || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total de Chamados",
      value: data?.totalCalls || 0,
      icon: ClipboardList,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Equipamentos",
      value: data?.totalEquipment || 0,
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Taxa de Conclusão",
      value: `${data?.completionRate.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-1 pr-4 sm:pl-2 sm:pr-6 py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard Analítico</h1>
            <p className="text-muted-foreground">Visão completa dos chamados técnicos</p>
          </div>
          <Button onClick={handleExportPdf} variant="default" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={16}>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8} collisionPadding={16}>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians?.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricsCards.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className={cn("h-4 w-4", metric.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando dados...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Chamados por Status</CardTitle>
              </CardHeader>
              <CardContent ref={statusChartRef}>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} chamados`, '']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        layout="horizontal"
                        align="center"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chamados por Técnico</CardTitle>
              </CardHeader>
              <CardContent ref={technicianChartRef}>
                {technicianData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={technicianData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {technicianData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} chamados`, '']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        layout="horizontal"
                        align="center"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chamados por Tipo de Serviço</CardTitle>
              </CardHeader>
              <CardContent ref={serviceTypeChartRef}>
                {serviceTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={serviceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {serviceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} chamados`, '']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        layout="horizontal"
                        align="center"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 5 Equipamentos</CardTitle>
              </CardHeader>
              <CardContent ref={equipmentChartRef}>
                {equipmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={equipmentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {equipmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} chamados`, '']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        layout="horizontal"
                        align="center"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 5 Clientes</CardTitle>
              </CardHeader>
              <CardContent ref={topClientsChartRef}>
                {clientData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={clientData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {clientData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} chamados`, '']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          padding: '8px'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        layout="horizontal"
                        align="center"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
