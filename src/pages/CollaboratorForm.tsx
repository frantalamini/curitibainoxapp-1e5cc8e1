import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, ShieldCheck } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCollaborators,
  type CollaboratorInput,
} from "@/hooks/useCollaborators";
import { computeLaborCost, type LaborCostInput } from "@/lib/laborCost";

const brl = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const emptyForm: CollaboratorInput = {
  full_name: "",
  phone: "",
  role_title: "",
  employment_type: "clt",
  attends_os: false,
  specialty_refrigeration: false,
  specialty_cooking: false,
  base_salary: 0,
  monthly_hours: 220,
  additionals: [],
  benefit_meal: 0,
  benefit_food: 0,
  benefit_transport: 0,
  benefit_fuel: 0,
  active: true,
};

const CollaboratorForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const {
    collaborators,
    isSimplesNacional,
    createCollaborator,
    updateCollaborator,
  } = useCollaborators();

  const [form, setForm] = useState<CollaboratorInput>(emptyForm);

  useEffect(() => {
    if (isEdit) {
      const c = collaborators.find((x) => x.id === id);
      if (c) {
        const { id: _id, cost_per_hour: _cph, ...rest } = c as any;
        setForm({ ...emptyForm, ...rest, additionals: c.additionals ?? [] });
      }
    }
  }, [id, isEdit, collaborators]);

  const set = <K extends keyof CollaboratorInput>(
    key: K,
    value: CollaboratorInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const num = (v: string) => (v === "" ? 0 : Number(v));

  const isMei = form.employment_type === "mei_pj";

  // Cálculo ao vivo do hora-homem
  const result = useMemo(() => {
    const input: LaborCostInput = {
      employmentType: form.employment_type,
      baseSalary: form.base_salary,
      monthlyHours: form.monthly_hours,
      additionals: form.additionals,
      benefitMeal: form.benefit_meal,
      benefitFood: form.benefit_food,
      benefitTransport: form.benefit_transport,
      benefitFuel: form.benefit_fuel,
    };
    return computeLaborCost(input, isSimplesNacional);
  }, [form, isSimplesNacional]);

  const addAdditional = () => {
    if (form.additionals.length >= 5) return;
    set("additionals", [
      ...form.additionals,
      { name: "", value: 0, incides_charges: true },
    ]);
  };

  const updateAdditional = (
    idx: number,
    patch: Partial<{ name: string; value: number; incides_charges: boolean }>,
  ) =>
    set(
      "additionals",
      form.additionals.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    );

  const removeAdditional = (idx: number) =>
    set(
      "additionals",
      form.additionals.filter((_, i) => i !== idx),
    );

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      return;
    }
    if (isEdit) {
      await updateCollaborator.mutateAsync({ id: id!, ...form });
    } else {
      await createCollaborator.mutateAsync(form);
    }
    navigate("/collaborators");
  };

  const saving = createCollaborator.isPending || updateCollaborator.isPending;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/collaborators")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">
            {isEdit ? "Editar Colaborador" : "Novo Colaborador"}
          </h1>
        </div>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="custos">Custos</TabsTrigger>
          </TabsList>

          {/* ABA DADOS */}
          <TabsContent value="dados">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={form.phone ?? ""}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role_title">Função</Label>
                    <Input
                      id="role_title"
                      value={form.role_title ?? ""}
                      onChange={(e) => set("role_title", e.target.value)}
                      placeholder="Ex: Técnico, Comprador, Administrativo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de vínculo</Label>
                  <Select
                    value={form.employment_type}
                    onValueChange={(v) =>
                      set(
                        "employment_type",
                        v as CollaboratorInput["employment_type"],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clt">CLT (com encargos)</SelectItem>
                      <SelectItem value="mei_pj">
                        MEI / PJ (sem encargos)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="attends_os">Atende OS (é técnico)</Label>
                    <p className="text-xs text-muted-foreground">
                      Quando ligado, aparece na lista de técnicos das ordens de
                      serviço.
                    </p>
                  </div>
                  <Switch
                    id="attends_os"
                    checked={form.attends_os}
                    onCheckedChange={(v) => set("attends_os", v)}
                  />
                </div>

                {form.attends_os && (
                  <div className="space-y-3 rounded-md border p-3">
                    <Label>Especialidades</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="spec_refrig"
                        checked={form.specialty_refrigeration}
                        onCheckedChange={(v) =>
                          set("specialty_refrigeration", !!v)
                        }
                      />
                      <Label
                        htmlFor="spec_refrig"
                        className="cursor-pointer font-normal"
                      >
                        Refrigeração Comercial
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="spec_cook"
                        checked={form.specialty_cooking}
                        onCheckedChange={(v) => set("specialty_cooking", !!v)}
                      />
                      <Label
                        htmlFor="spec_cook"
                        className="cursor-pointer font-normal"
                      >
                        Cocção
                      </Label>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Ativo</Label>
                  <Switch
                    id="active"
                    checked={form.active}
                    onCheckedChange={(v) => set("active", v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA CUSTOS */}
          <TabsContent value="custos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" />
                  Custos do colaborador
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Uso interno (gerencial). Regime tributário:{" "}
                  <strong>
                    {isSimplesNacional
                      ? "Simples Nacional"
                      : "Lucro Presumido/Real"}
                  </strong>{" "}
                  — lido das Configurações Fiscais.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="base_salary">
                      {isMei ? "Valor mensal (nota)" : "Salário base"} (R$)
                    </Label>
                    <Input
                      id="base_salary"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.base_salary || ""}
                      onChange={(e) => set("base_salary", num(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_hours">
                      Carga horária mensal (h)
                    </Label>
                    <Input
                      id="monthly_hours"
                      type="number"
                      step="1"
                      min="1"
                      value={form.monthly_hours || ""}
                      onChange={(e) =>
                        set("monthly_hours", num(e.target.value))
                      }
                    />
                  </div>
                </div>

                {/* Adicionais */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Adicionais (até 5)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addAdditional}
                      disabled={form.additionals.length >= 5}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>
                  {form.additionals.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Ex: insalubridade, periculosidade. Marque "incide
                      encargos" quando for adicional salarial.
                    </p>
                  )}
                  {form.additionals.map((a, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center"
                    >
                      <Input
                        placeholder="Nome do adicional"
                        value={a.name}
                        onChange={(e) =>
                          updateAdditional(idx, { name: e.target.value })
                        }
                        className="sm:flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="R$"
                        value={a.value || ""}
                        onChange={(e) =>
                          updateAdditional(idx, { value: num(e.target.value) })
                        }
                        className="sm:w-28"
                      />
                      <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                        <Checkbox
                          checked={a.incides_charges}
                          onCheckedChange={(v) =>
                            updateAdditional(idx, { incides_charges: !!v })
                          }
                        />
                        incide encargos
                      </label>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeAdditional(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Benefícios */}
                <div className="space-y-2">
                  <Label>Benefícios (não incidem encargos)</Label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        ["benefit_meal", "Vale refeição"],
                        ["benefit_food", "Vale alimentação"],
                        ["benefit_transport", "Auxílio transporte"],
                        ["benefit_fuel", "Auxílio combustível"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={key} className="text-xs">
                          {label} (R$)
                        </Label>
                        <Input
                          id={key}
                          type="number"
                          step="0.01"
                          min="0"
                          value={(form[key] as number) || ""}
                          onChange={(e) =>
                            set(key, num(e.target.value) as never)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resultado ao vivo */}
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                  {!isMei && (
                    <div className="space-y-1 text-sm">
                      <Row label="13º (provisão)" value={result.thirteenth} />
                      <Row label="Férias (provisão)" value={result.vacation} />
                      <Row label="1/3 de férias" value={result.vacationThird} />
                      <Row label="FGTS (8%)" value={result.fgts} />
                      {result.employerInss > 0 && (
                        <Row
                          label="INSS patronal"
                          value={result.employerInss}
                        />
                      )}
                      <Row label="Benefícios" value={result.benefitsTotal} />
                    </div>
                  )}
                  {isMei && (
                    <p className="text-xs text-muted-foreground">
                      MEI/PJ não gera encargos trabalhistas. Custo = valor pago
                      + benefícios.
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
                    <span>Custo mensal total</span>
                    <span>{brl(result.monthlyCost)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-primary/10 p-3">
                    <span className="font-semibold">Custo hora-homem</span>
                    <span className="text-2xl font-bold tabular-nums text-primary">
                      {brl(result.hourlyCost)}/h
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-4">
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {isEdit ? "Atualizar" : "Salvar"} Colaborador
          </Button>
          <Button variant="outline" onClick={() => navigate("/collaborators")}>
            Cancelar
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

const Row = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between text-muted-foreground">
    <span>{label}</span>
    <span>{brl(value)}</span>
  </div>
);

export default CollaboratorForm;
