import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TechnicianSatisfaction {
  technician_id: string;
  technician_name: string;
  total_surveys: number;
  total_responses: number;
  response_rate: number;
  avg_service: number;
  avg_attendance: number;
  avg_overall: number;
  alerts_count: number;
  ratings: Array<{
    os_number: number;
    client_name: string;
    rating_service: number | null;
    rating_attendance: number | null;
    survey_sent_at: string;
    response_received_at: string | null;
  }>;
}

export function useSatisfactionReport(year: number, month?: number) {
  return useQuery({
    queryKey: ["satisfaction-report", year, month],
    queryFn: async () => {
      let startDate: string;
      let endDate: string;

      if (month) {
        startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      } else {
        startDate = `${year}-01-01`;
        endDate = `${year + 1}-01-01`;
      }

      const { data, error } = await (supabase as any)
        .from("satisfaction_surveys")
        .select("*")
        .gte("survey_sent_at", startDate)
        .lt("survey_sent_at", endDate)
        .order("survey_sent_at", { ascending: false });

      if (error) throw error;

      const surveys = data || [];

      // Agrupar por técnico
      const byTech: Record<string, TechnicianSatisfaction> = {};

      for (const s of surveys) {
        const techId = s.technician_id || "unknown";
        const techName = s.technician_name || "Desconhecido";

        if (!byTech[techId]) {
          byTech[techId] = {
            technician_id: techId,
            technician_name: techName,
            total_surveys: 0,
            total_responses: 0,
            response_rate: 0,
            avg_service: 0,
            avg_attendance: 0,
            avg_overall: 0,
            alerts_count: 0,
            ratings: [],
          };
        }

        const tech = byTech[techId];
        tech.total_surveys++;

        if (s.rating_service != null) {
          tech.total_responses++;
        }

        if (
          (s.rating_service != null && s.rating_service <= 3) ||
          (s.rating_attendance != null && s.rating_attendance <= 3)
        ) {
          tech.alerts_count++;
        }

        tech.ratings.push({
          os_number: s.os_number,
          client_name: s.client_name || "",
          rating_service: s.rating_service,
          rating_attendance: s.rating_attendance,
          survey_sent_at: s.survey_sent_at,
          response_received_at: s.response_received_at,
        });
      }

      // Calcular médias
      const technicians: TechnicianSatisfaction[] = Object.values(byTech).map(
        (tech) => {
          const responded = tech.ratings.filter(
            (r) => r.rating_service != null,
          );
          const svcRatings = responded
            .map((r) => r.rating_service!)
            .filter(Boolean);
          const attRatings = responded
            .map((r) => r.rating_attendance!)
            .filter(Boolean);

          const avgSvc =
            svcRatings.length > 0
              ? svcRatings.reduce((a, b) => a + b, 0) / svcRatings.length
              : 0;
          const avgAtt =
            attRatings.length > 0
              ? attRatings.reduce((a, b) => a + b, 0) / attRatings.length
              : 0;

          return {
            ...tech,
            response_rate:
              tech.total_surveys > 0
                ? (tech.total_responses / tech.total_surveys) * 100
                : 0,
            avg_service: avgSvc,
            avg_attendance: avgAtt,
            avg_overall:
              avgSvc && avgAtt ? (avgSvc + avgAtt) / 2 : avgSvc || avgAtt,
          };
        },
      );

      // Ordenar por média geral (desc)
      technicians.sort((a, b) => b.avg_overall - a.avg_overall);

      // Totais gerais
      const totalSurveys = surveys.length;
      const totalResponses = surveys.filter(
        (s) => s.rating_service != null,
      ).length;
      const allSvcRatings = surveys
        .filter((s) => s.rating_service != null)
        .map((s) => s.rating_service!);
      const allAttRatings = surveys
        .filter((s) => s.rating_attendance != null)
        .map((s) => s.rating_attendance!);

      return {
        technicians,
        totalSurveys,
        totalResponses,
        responseRate:
          totalSurveys > 0 ? (totalResponses / totalSurveys) * 100 : 0,
        avgService:
          allSvcRatings.length > 0
            ? allSvcRatings.reduce((a, b) => a + b, 0) / allSvcRatings.length
            : 0,
        avgAttendance:
          allAttRatings.length > 0
            ? allAttRatings.reduce((a, b) => a + b, 0) / allAttRatings.length
            : 0,
        totalAlerts: surveys.filter(
          (s) =>
            (s.rating_service != null && s.rating_service <= 3) ||
            (s.rating_attendance != null && s.rating_attendance <= 3),
        ).length,
      };
    },
  });
}
