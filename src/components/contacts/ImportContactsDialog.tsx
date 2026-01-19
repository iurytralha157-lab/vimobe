import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { usePipelines, useStages } from "@/hooks/use-pipelines";
import { useOrganizationUsers } from "@/hooks/use-users";
import { useCreateLead } from "@/hooks/use-leads";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedContact {
  nome: string;
  telefone?: string;
  email?: string;
  mensagem?: string;
  [key: string]: string | undefined;
}

const sourceOptions = [
  { value: "import", label: "Importação" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google Ads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "manual", label: "Manual" },
  { value: "outros", label: "Outros" },
];

export function ImportContactsDialog({
  open,
  onOpenChange,
}: ImportContactsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedContact[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("none");
  const [selectedSource, setSelectedSource] = useState<string>("import");
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: pipelines = [] } = usePipelines();
  const { data: stages = [] } = useStages(selectedPipeline || undefined);
  const { data: users = [] } = useOrganizationUsers();
  const createLead = useCreateLead();

  const parseFile = async (selectedFile: File) => {
    try {
      // Dynamic import for xlsx
      const XLSX = await import("xlsx");
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      // Normalize column names
      const normalizedData = jsonData
        .map((row) => {
          const normalized: ParsedContact = { nome: "" };
          Object.entries(row).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase().trim();
            if (lowerKey === "nome" || lowerKey === "name") {
              normalized.nome = String(value || "");
            } else if (
              lowerKey === "telefone" ||
              lowerKey === "phone" ||
              lowerKey === "tel"
            ) {
              normalized.telefone = String(value || "");
            } else if (lowerKey === "email" || lowerKey === "e-mail") {
              normalized.email = String(value || "");
            } else if (
              lowerKey === "mensagem" ||
              lowerKey === "message" ||
              lowerKey === "observacao" ||
              lowerKey === "observação" ||
              lowerKey === "note"
            ) {
              normalized.mensagem = String(value || "");
            } else {
              normalized[lowerKey] = String(value || "");
            }
          });
          return normalized;
        })
        .filter((row) => row.nome);

      setParsedData(normalizedData);

      if (normalizedData.length === 0) {
        toast.error(
          'Nenhum contato válido encontrado. Verifique se a coluna "nome" existe.'
        );
      } else {
        toast.success(`${normalizedData.length} contatos encontrados`);
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Erro ao processar arquivo");
    }
  };

  const handleFileChange = useCallback((selectedFile: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const hasValidExtension = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      toast.error("Formato inválido. Use arquivos .xlsx, .xls ou .csv");
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileChange(droppedFile);
      }
    },
    [handleFileChange]
  );

  const handleImport = async () => {
    if (!selectedPipeline || parsedData.length === 0) {
      toast.error("Selecione uma pipeline e carregue um arquivo válido");
      return;
    }

    setIsImporting(true);
    let success = 0;
    let failed = 0;

    const firstStage =
      stages.length > 0
        ? stages.sort((a, b) => a.position - b.position)[0]
        : null;

    for (const contact of parsedData) {
      try {
        await createLead.mutateAsync({
          name: contact.nome,
          phone: contact.telefone,
          email: contact.email,
          message: contact.mensagem,
          pipeline_id: selectedPipeline,
          stage_id: firstStage?.id,
          assigned_user_id:
            selectedAssignee !== "none" ? selectedAssignee : undefined,
        });
        success++;
      } catch (error) {
        failed++;
      }
    }

    setImportResult({ success, failed });
    setIsImporting(false);

    if (success > 0) {
      toast.success(`${success} contatos importados com sucesso!`);
    }
    if (failed > 0) {
      toast.error(`${failed} contatos falharam na importação`);
    }
  };

  const downloadSample = async () => {
    const XLSX = await import("xlsx");
    const sampleData = [
      {
        nome: "João Silva",
        telefone: "5511999998888",
        email: "joao@exemplo.com",
        mensagem: "Interessado no imóvel",
      },
      {
        nome: "Maria Santos",
        telefone: "5511988887777",
        email: "maria@exemplo.com",
        mensagem: "Quer agendar visita",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contatos");
    XLSX.writeFile(workbook, "exemplo_importacao_contatos.xlsx");
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData([]);
    setSelectedPipeline("");
    setSelectedAssignee("none");
    setSelectedSource("import");
    setImportResult(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar contatos
          </DialogTitle>
          <DialogDescription>
            Importe contatos de um arquivo Excel ou CSV
          </DialogDescription>
        </DialogHeader>

        {importResult ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <div>
              <p className="text-lg font-medium">Importação concluída!</p>
              <p className="text-muted-foreground mt-1">
                {importResult.success} contatos importados
                {importResult.failed > 0 && `, ${importResult.failed} falharam`}
              </p>
            </div>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        ) : (
          <>
            {/* Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                file && "border-primary bg-primary/5"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) =>
                  e.target.files?.[0] && handleFileChange(e.target.files[0])
                }
                className="hidden"
              />

              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-10 w-10 text-primary mx-auto" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.length} contatos encontrados
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 text-primary mx-auto" />
                  <p className="font-medium">
                    Arraste e solte um arquivo aqui, ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos suportados: .xlsx, .xls, .csv
                  </p>
                </div>
              )}
            </div>

            {/* Pipeline Selection */}
            <div className="space-y-2">
              <Label>Selecione uma Pipeline *</Label>
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a pipeline para os contatos" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Os contatos serão importados para o primeiro estágio desta pipeline
              </p>
            </div>

            {/* Source Selection */}
            <div className="space-y-2">
              <Label>Origem dos leads *</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Selection */}
            <div className="space-y-2">
              <Label>Responsável (opcional)</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <p className="text-muted-foreground">
                A planilha deve conter colunas com os títulos:{" "}
                <strong>'nome'</strong> (obrigatório) e opcionais como
                'telefone', 'email', 'mensagem'.
              </p>

              <div className="flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSample();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar exemplo
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !file || !selectedPipeline || parsedData.length === 0 || isImporting
                }
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
