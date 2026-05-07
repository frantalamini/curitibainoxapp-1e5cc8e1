import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { useQRProducts, useQRProduct } from "@/hooks/useQRProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const QRProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { createProduct, updateProduct } = useQRProducts();
  const { data: existingProduct } = useQRProduct(id);

  const [name, setName] = useState("");
  const [modelCode, setModelCode] = useState("");
  const [category, setCategory] = useState("Outros");
  const [description, setDescription] = useState("");
  const [serialFormat, setSerialFormat] = useState("prefix_year_seq");
  const [serialPrefix, setSerialPrefix] = useState("CI");
  const [nextSerial, setNextSerial] = useState(1);
  const [lotFormat, setLotFormat] = useState("lt_year_month");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingProduct) {
      setName(existingProduct.name);
      setModelCode(existingProduct.model_code);
      setCategory(existingProduct.category || "Outros");
      setDescription(existingProduct.description || "");
      setSerialFormat(existingProduct.serial_format);
      setSerialPrefix(existingProduct.serial_prefix);
      setNextSerial(existingProduct.next_serial);
      setLotFormat(existingProduct.lot_format);
    }
  }, [existingProduct]);

  const handleSave = async () => {
    if (!name.trim() || !modelCode.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        model_code: modelCode.trim(),
        category,
        description: description.trim() || undefined,
        serial_format: serialFormat,
        serial_prefix: serialPrefix,
        next_serial: nextSerial,
        lot_format: lotFormat,
      };
      if (isEditing && id) {
        await updateProduct({ id, ...data });
      } else {
        await createProduct(data);
      }
      navigate("/qr-code/produtos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="w-full max-w-[1400px] mr-auto pl-2 pr-6 sm:pl-3 sm:pr-8 lg:pl-4 lg:pr-10 py-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/qr-code/produtos")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="bg-white rounded-lg border p-6 space-y-5">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Editar Produto" : "Cadastrar Produto"}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Nome do Produto
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Esterilizador 150L"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Codigo do Modelo
              </label>
              <Input
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                placeholder="Ex: EST-150-I"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Codigo unico que identifica este modelo
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Categoria
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Esterilizadores">
                    Esterilizadores
                  </SelectItem>
                  <SelectItem value="Cozinhas Industriais">
                    Cozinhas Industriais
                  </SelectItem>
                  <SelectItem value="Mesas e Bancadas">
                    Mesas e Bancadas
                  </SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Descricao (opcional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descricao breve do produto"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Regras de Serial
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Formato do Serial
                </label>
                <Select value={serialFormat} onValueChange={setSerialFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prefix_year_seq">
                      Prefixo + Ano + Sequencial (CI-2026-00001)
                    </SelectItem>
                    <SelectItem value="sequential">
                      Apenas Sequencial (00001)
                    </SelectItem>
                    <SelectItem value="model_seq">
                      Modelo + Sequencial (EST-00001)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Prefixo do Serial
                </label>
                <Input
                  value={serialPrefix}
                  onChange={(e) => setSerialPrefix(e.target.value)}
                  placeholder="Ex: CI, EST"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Proximo sequencial
                </label>
                <Input
                  type="number"
                  value={nextSerial}
                  onChange={(e) => setNextSerial(parseInt(e.target.value) || 1)}
                  min={1}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O sistema incrementa automaticamente
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Regras de Lote
            </h3>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">
                Formato do Lote
              </label>
              <Select value={lotFormat} onValueChange={setLotFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lt_year_month">
                    LT + Ano + Mes (LT-2026-03)
                  </SelectItem>
                  <SelectItem value="lt_seq">
                    LT + Sequencial (LT-001)
                  </SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate("/qr-code/produtos")}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !modelCode.trim()}
              className="flex-1"
            >
              {saving ? "Salvando..." : "Salvar Produto"}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default QRProductForm;
