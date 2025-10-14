
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { z } from "zod";
import {
  Factory,
  Leaf,
  PlusCircle,
  Trash2,
  Truck,
  FileUp,
  Zap,
} from "lucide-react";
import { Construction, FileSpreadsheet } from "@/components/icons";
import React, { useMemo, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from 'xlsx';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { emissionFactors } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  rawMaterials: z.array(
    z.object({
      material: z.string().min(1, "Veuillez sélectionner un matériau."),
      quantity: z.coerce.number().min(0.01, "La quantité doit être supérieure à 0."),
      comment: z.string().optional(),
      concreteType: z.string().optional(),
      cementMass: z.coerce.number().optional(),
      isReinforced: z.boolean().optional(),
      rebarMass: z.coerce.number().optional(),
      rebarFactor: z.coerce.number().optional(),
    })
  ),
  manufacturing: z.array(
    z.object({
      process: z.string().min(1, "Veuillez sélectionner un processus."),
      value: z.coerce.number().min(0.01, "La valeur doit être supérieure à 0."),
      comment: z.string().optional(),
    })
  ),
  energy: z.array(
    z.object({
      source: z.string().min(1, "Veuillez sélectionner une source."),
      consumption: z.coerce.number().min(0.01, "La consommation doit être supérieure à 0."),
      comment: z.string().optional(),
    })
  ),
  implementation: z.array(
    z.object({
      process: z.string().min(1, "Veuillez sélectionner un processus."),
      duration: z.coerce.number().min(0.01, "La durée doit être supérieure à 0."),
      comment: z.string().optional(),
    })
  ),
  transport: z.array(
    z.object({
      mode: z.string().min(1, "Veuillez sélectionner un mode de transport."),
      distance: z.coerce.number().min(0.1, "La distance doit être supérieure à 0."),
      weight: z.coerce.number().min(0.01, "Le poids doit être supérieur à 0."),
      comment: z.string().optional(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const materialOptions = emissionFactors.materials.map((m) => m.name);
const concreteOptions = emissionFactors.concrete.map((c) => c.name);
const rebarOptions = emissionFactors.rebar;
const processOptions = emissionFactors.manufacturing.map((p) => p.name);
const energyOptions = emissionFactors.energy.map((e) => e.name);
const implementationOptions = emissionFactors.implementation.map((i) => i.name);
const transportOptions = emissionFactors.transport.map((t) => t.name);

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" /> {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div>{actions}</div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

const TotalsDisplay = ({
  consultationLabel,
  totals,
  details,
}: {
  consultationLabel: string;
  totals: {
    rawMaterials: number;
    manufacturing: number;
    energy: number;
    implementation: number;
    transport: number;
    grandTotal: number;
  };
  details: {
    rawMaterials: { name: string; co2e: number }[];
    manufacturing: { name: string; co2e: number }[];
    energy: { name: string; co2e: number }[];
    implementation: { name: string; co2e: number }[];
    transport: { name: string; co2e: number }[];
  };
}) => {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    let colorIndex = 0;
    
    Object.values(details).flat().forEach(item => {
      if (item.name && !config[item.name]) {
        config[item.name] = {
          label: item.name,
          color: colors[colorIndex % colors.length]
        };
        colorIndex++;
      }
    });

    return config;
  }, [details]);


  const detailedChartData = useMemo(() => {
    const data = [
      {
        name: "Matériaux",
        ...details.rawMaterials.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Fabrication",
        ...details.manufacturing.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Energie",
        ...details.energy.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Mise en œuvre",
        ...details.implementation.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Transport",
        ...details.transport.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
    ];
    return data.filter(d => Object.keys(d).length > 1);
  }, [details]);
  

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <CardTitle>Bilan des émissions</CardTitle>
            {consultationLabel && (
              <CardDescription>{consultationLabel}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total général</p>
          <p className="text-4xl font-bold tracking-tighter">
            {totals.grandTotal.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">kg CO₂e</p>
        </div>
        <div className="h-64 w-full">
          {detailedChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={detailedChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="kg" tickFormatter={(value) => value.toFixed(0)} />
                
                <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{fontSize: "0.8rem"}} />

                {Object.keys(chartConfig).map((key) => (
                    <Bar key={key} dataKey={key} fill={chartConfig[key]?.color || '#8884d8'} stackId="a" radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Aucune donnée à afficher.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export function CarbonConsultForm({ consultationLabel }: { consultationLabel: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawMaterials: [],
      manufacturing: [],
      energy: [],
      implementation: [],
      transport: [],
    },
  });

  const { fields: rmFields, append: rmAppend, remove: rmRemove } = useFieldArray({
    control: form.control,
    name: "rawMaterials",
  });
  const { fields: mfgFields, append: mfgAppend, remove: mfgRemove } = useFieldArray({
    control: form.control,
    name: "manufacturing",
  });
  const { fields: energyFields, append: energyAppend, remove: energyRemove } = useFieldArray({
    control: form.control,
    name: "energy",
  });
  const { fields: implFields, append: implAppend, remove: implRemove } = useFieldArray({
    control: form.control,
    name: "implementation",
  });
  const { fields: tptFields, append: tptAppend, remove: tptRemove } = useFieldArray({
    control: form.control,
    name: "transport",
  });

  const watchedValues = useWatch({ control: form.control });
  const watchedRawMaterials = useWatch({ control: form.control, name: "rawMaterials" });
  const watchedManufacturing = useWatch({ control: form.control, name: "manufacturing" });


  const calculateEmissions = (values: FormValues) => {
    const rmDetails = values.rawMaterials?.map(item => {
      let co2e = 0;
      let name = item.material || "Inconnu";
      
      if (item.material === "Béton") {
        name = item.concreteType || "Béton";
        const quantity = item.quantity || 0;
        const cementMass = item.cementMass || 0;
        const concreteFactor = emissionFactors.concrete.find(c => c.name === item.concreteType)?.factor || 0;
        
        const cementCO2e = (quantity * cementMass) * concreteFactor;
        co2e += cementCO2e;
        
        if (item.isReinforced) {
          const rebarMass = item.rebarMass || 0;
          const rebarFactorValue = item.rebarFactor || 0;
          const rebarCO2e = (quantity * rebarMass) * rebarFactorValue;
          co2e += rebarCO2e;
          name = `${name} armé`;
        }
      } else {
        const factor = emissionFactors.materials.find(m => m.name === item.material)?.factor || 0;
        co2e = (item.quantity || 0) * factor;
      }
      
      return { name, co2e };
    }).filter(item => item.co2e > 0) || [];
    
    const mfgDetails = values.manufacturing?.map(item => {
      const factor = emissionFactors.manufacturing.find(p => p.name === item.process)?.factor || 0;
      return { name: item.process || "Inconnu", co2e: (item.value || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const energyDetails = values.energy?.map(item => {
      const factor = emissionFactors.energy.find(e => e.name === item.source)?.factor || 0;
      return { name: item.source || "Inconnu", co2e: (item.consumption || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const implDetails = values.implementation?.map(item => {
      const factor = emissionFactors.implementation.find(i => i.name === item.process)?.factor || 0;
      return { name: item.process || "Inconnu", co2e: (item.duration || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const tptDetails = values.transport?.map(item => {
      const factor = emissionFactors.transport.find(t => t.name === item.mode)?.factor || 0;
      return { name: item.mode || "Inconnu", co2e: (item.distance || 0) * (item.weight || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const rmTotal = rmDetails.reduce((sum, item) => sum + item.co2e, 0);
    const mfgTotal = mfgDetails.reduce((sum, item) => sum + item.co2e, 0);
    const energyTotal = energyDetails.reduce((sum, item) => sum + item.co2e, 0);
    const implTotal = implDetails.reduce((sum, item) => sum + item.co2e, 0);
    const tptTotal = tptDetails.reduce((sum, item) => sum + item.co2e, 0);

    return {
      totals: {
        rawMaterials: rmTotal,
        manufacturing: mfgTotal,
        energy: energyTotal,
        implementation: implTotal,
        transport: tptTotal,
        grandTotal: rmTotal + mfgTotal + energyTotal + implTotal + tptTotal,
      },
      details: {
        rawMaterials: rmDetails,
        manufacturing: mfgDetails,
        energy: energyDetails,
        implementation: implDetails,
        transport: tptDetails,
      }
    };
  };

  const { totals, details } = useMemo(() => calculateEmissions(watchedValues as FormValues), [watchedValues]);

  const handleExportToExcel = () => {
    try {
        const data = form.getValues();
        const { totals: calculatedTotals, details: calculatedDetails } = calculateEmissions(data);

        const header = [
            "Rubriques",
            "Méthodes",
            "Unité",
            "Quantité",
            "Facteur d'émission (kg CO²e)",
            "Masse ciment (kg/m³)",
            "Facteur d'émission armature (kg CO²e)",
            "Masse de ferraillage (kg/m³)",
            "Poids (tonnes)",
            "Kg CO²e",
            "Commentaires explicatifs"
        ];
        const ws_data: (string | number)[][] = [header];

        const getEmissionFactor = (rubrique: string, item: any) => {
            switch (rubrique) {
                case 'Matériaux':
                    if (item.material === 'Béton') {
                        return emissionFactors.concrete.find(c => c.name === item.concreteType)?.factor || 0;
                    }
                    return emissionFactors.materials.find(m => m.name === item.material)?.factor || 0;
                case 'Fabrication':
                    return emissionFactors.manufacturing.find(p => p.name === item.process)?.factor || 0;
                case 'Energie':
                    return emissionFactors.energy.find(e => e.name === item.source)?.factor || 0;
                case 'Mise en œuvre':
                    return emissionFactors.implementation.find(i => i.name === item.process)?.factor || 0;
                case 'Transport':
                    return emissionFactors.transport.find(t => t.name === item.mode)?.factor || 0;
                default:
                    return 0;
            }
        };

        const addRow = (rubrique: string, item: any, co2e: number) => {
            let row: (string | number)[] = Array(header.length).fill('');
            let methodName = item.material || item.process || item.mode || item.source;

            row[0] = rubrique;
            row[10] = item.comment || '';

            if (rubrique === 'Matériaux') {
                row[3] = (item.quantity || 0).toString();
                row[2] = item.material === 'Béton' ? 'm³' : 'kg';
                row[4] = getEmissionFactor(rubrique, item);

                if (item.material === "Béton") {
                    methodName = item.concreteType || "Béton";
                    row[5] = (item.cementMass || 0).toString();
                    if (item.isReinforced) {
                        methodName += " armé";
                        row[6] = (item.rebarFactor || 0).toString();
                        row[7] = (item.rebarMass || 0).toString();
                    }
                }
            } else if (rubrique === 'Fabrication') {
                row[3] = (item.value || 0).toString();
                const processData = emissionFactors.manufacturing.find(m => m.name === item.process);
                row[2] = processData?.unit.endsWith('/hr') ? 'H' : 'kg';
                row[4] = getEmissionFactor(rubrique, item);
            } else if (rubrique === 'Energie') {
                row[3] = (item.consumption || 0).toString();
                row[2] = 'H';
                row[4] = getEmissionFactor(rubrique, item);
            } else if (rubrique === 'Mise en œuvre') {
                row[3] = (item.duration || 0).toString();
                row[2] = 'H';
                row[4] = getEmissionFactor(rubrique, item);
            } else if (rubrique === 'Transport') {
                row[3] = (item.distance || 0).toString();
                row[2] = 'km';
                row[8] = (item.weight || 0).toString();
                row[4] = getEmissionFactor(rubrique, item);
            }
            
            row[1] = methodName;
            row[9] = co2e.toFixed(2);

            ws_data.push(row);
        };
        
        data.rawMaterials?.forEach((item, index) => {
            const co2eItem = calculatedDetails.rawMaterials.find((d, i) => i === index);
            if (item.material) addRow('Matériaux', item, co2eItem?.co2e || 0);
        });

        data.manufacturing?.forEach((item, index) => {
            const co2eItem = calculatedDetails.manufacturing.find((d, i) => i === index);
            if (item.process) addRow('Fabrication', item, co2eItem?.co2e || 0);
        });
        
        data.energy?.forEach((item, index) => {
            const co2eItem = calculatedDetails.energy.find((d, i) => i === index);
            if (item.source) addRow('Energie', item, co2eItem?.co2e || 0);
        });

        data.implementation?.forEach((item, index) => {
            const co2eItem = calculatedDetails.implementation.find((d, i) => i === index);
            if (item.process) addRow('Mise en œuvre', item, co2eItem?.co2e || 0);
        });

        data.transport?.forEach((item, index) => {
            const co2eItem = calculatedDetails.transport.find((d, i) => i === index);
            if (item.mode) addRow('Transport', item, co2eItem?.co2e || 0);
        });

        let totalRow: (string | number)[] = Array(header.length).fill('');
        totalRow[0] = "Total";
        totalRow[9] = calculatedTotals.grandTotal.toFixed(2);
        ws_data.push(totalRow);
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFD3D3D3" } } };
        const totalStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFD3D3D3" } } };

        const getColumnLetter = (colIndex: number) => {
            let temp, letter = '';
            while (colIndex >= 0) {
                temp = colIndex % 26;
                letter = String.fromCharCode(temp + 65) + letter;
                colIndex = Math.floor(colIndex / 26) - 1;
            }
            return letter;
        }

        if(!ws['!cols']) ws['!cols'] = [];
        header.forEach((h, i) => {
            const cellRef = getColumnLetter(i) + '1';
            if(ws[cellRef]) {
               ws[cellRef].s = headerStyle;
            }
            const colWidth = Math.max(h.length, ...ws_data.map(row => (row[i] || '').toString().length)) + 2;
            ws['!cols'][i] = { wch: colWidth };
        });

        const totalRowIndex = ws_data.length;
        const totalCellRef = 'A' + totalRowIndex;
        if(ws[totalCellRef]) {
            ws[totalCellRef].s = totalStyle;
        }
        const totalValueCellRef = getColumnLetter(9) + totalRowIndex;
        if(ws[totalValueCellRef]) {
            ws[totalValueCellRef].s = totalStyle;
        }


        XLSX.utils.book_append_sheet(wb, ws, 'Bilan Carbone');
        XLSX.writeFile(wb, `bilan_carbone_${consultationLabel.replace(/ /g, '_') || 'export'}.xlsx`);

        toast({
            title: "Exportation réussie",
            description: "Le fichier Excel du bilan carbone a été téléchargé.",
        });
    } catch(e) {
        console.error("Erreur lors de l'export Excel:", e);
        toast({
            variant: "destructive",
            title: "Échec de l'exportation",
            description: "Une erreur est survenue lors de la génération du fichier Excel.",
        });
    }
  };

  const handleImportFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

            const headers = json[0] as string[];
            const dataRows = json.slice(1);

            const newValues: FormValues = {
                rawMaterials: [],
                manufacturing: [],
                energy: [],
                implementation: [],
                transport: [],
            };
            
            const headerMap: { [key: string]: number } = {};
            headers.forEach((h, i) => {
                headerMap[h.trim()] = i;
            });

            let currentSection = '';
            dataRows.forEach(row => {
                const section = (row[headerMap['Rubriques']] || currentSection)?.trim();
                if (section && section !== 'Total') {
                    currentSection = section;
                }

                const methodName = (row[headerMap['Méthodes']])?.trim();
                if (!methodName) return;
                
                const quantity = Number(row[headerMap['Quantité']]) || 0;
                const comment = row[headerMap['Commentaires explicatifs']] || '';
                
                switch (currentSection) {
                    case 'Matériaux': {
                        let material = methodName;
                        let concreteType;
                        const isReinforced = methodName.includes('armé');
                        if (isReinforced) {
                             material = 'Béton';
                             concreteType = methodName.replace(' armé', '').trim();
                        } else if (emissionFactors.concrete.some(c => c.name === methodName)) {
                            material = 'Béton';
                            concreteType = methodName;
                        }
                        
                        newValues.rawMaterials.push({
                            material: material,
                            quantity: quantity,
                            comment: comment,
                            concreteType: concreteType,
                            cementMass: Number(row[headerMap['Masse ciment (kg/m³)']]) || 0,
                            isReinforced: isReinforced,
                            rebarMass: Number(row[headerMap['Masse de ferraillage (kg/m³)']]) || 0,
                            rebarFactor: Number(row[headerMap["Facteur d'émission armature (kg CO²e)"]]) || 0,
                        });
                        break;
                    }
                    case 'Fabrication':
                        newValues.manufacturing.push({
                            process: methodName,
                            value: quantity,
                            comment: comment,
                        });
                        break;
                    case 'Energie':
                        newValues.energy.push({
                            source: methodName,
                            consumption: quantity,
                            comment: comment,
                        });
                        break;
                    case 'Mise en œuvre':
                        newValues.implementation.push({
                            process: methodName,
                            duration: quantity,
                            comment: comment,
                        });
                        break;
                    case 'Transport':
                        newValues.transport.push({
                            mode: methodName,
                            distance: quantity,
                            weight: Number(row[headerMap['Poids (tonnes)']]) || 0,
                            comment: comment,
                        });
                        break;
                }
            });
            form.reset(newValues);
            toast({
                title: "Importation réussie",
                description: "Les données du fichier ont été chargées dans le formulaire.",
            });
        } catch (error) {
            console.error("Erreur lors de l'importation du fichier:", error);
            toast({
                variant: 'destructive',
                title: "Échec de l'importation",
                description: "Le fichier est peut-être corrompu ou son format est incorrect.",
            });
        } finally {
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Form {...form}>
      <div
        className="grid w-full grid-cols-1 gap-8 lg:grid-cols-3"
      >
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Tabs defaultValue="materials" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 print:hidden">
              <TabsTrigger value="materials">
                <Leaf className="mr-2 h-4 w-4" /> Matériaux
              </TabsTrigger>
              <TabsTrigger value="manufacturing">
                <Factory className="mr-2 h-4 w-4" /> Fabrication
              </TabsTrigger>
              <TabsTrigger value="energy">
                <Zap className="mr-2 h-4 w-4" /> Energie
              </TabsTrigger>
              <TabsTrigger value="implementation">
                <Construction className="mr-2 h-4 w-4" /> Mise en œuvre
              </TabsTrigger>
              <TabsTrigger value="transport">
                <Truck className="mr-2 h-4 w-4" /> Transport
              </TabsTrigger>
            </TabsList>
            
            <div className="print:hidden">
                <TabsContent value="materials">
                  <SectionCard
                    title="Matériaux"
                    description="Spécifiez les matériaux utilisés et leurs quantités."
                    icon={Leaf}
                    actions={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => rmAppend({ 
                          material: "", 
                          quantity: 0,
                          comment: "",
                          concreteType: "",
                          cementMass: 0,
                          isReinforced: false,
                          rebarMass: 0,
                          rebarFactor: 1.2
                        })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un matériau
                      </Button>
                    }
                  >
                    {rmFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucun matériau ajouté.</p>}
                    {rmFields.map((field, index) => {
                      const isConcrete = watchedRawMaterials[index]?.material === 'Béton';
                      const isReinforced = isConcrete && watchedRawMaterials[index]?.isReinforced;

                      return (
                      <div key={field.id} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-md border p-4">
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`rawMaterials.${index}.material`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Matériau</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez un matériau" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {materialOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`rawMaterials.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantité ({isConcrete ? 'm³' : 'kg'})</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder={isConcrete ? "ex: 10" : "ex: 100"} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {isConcrete && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-md border bg-card/50 p-4">
                               <FormField
                                control={form.control}
                                name={`rawMaterials.${index}.concreteType`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Type béton bas carbone</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Sélectionnez un type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {concreteOptions.map(c => <SelectItem key={c} value={c}>{`${c} (${emissionFactors.concrete.find(f => f.name === c)?.factor} kgCO₂/kg)`}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`rawMaterials.${index}.cementMass`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Masse ciment (kg/m³)</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="ex: 300" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                               <FormField
                                control={form.control}
                                name={`rawMaterials.${index}.isReinforced`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md p-4 col-span-full">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>
                                        Béton armé
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          {isReinforced && (
                             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-md border bg-card/50 p-4">
                                <p className="col-span-full font-medium text-sm">Paramètres du Béton Armé</p>
                               <FormField
                                control={form.control}
                                name={`rawMaterials.${index}.rebarMass`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Masse de ferraillage (kg/m³)</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="ex: 100" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                               <FormField
                                control={form.control}
                                name={`rawMaterials.${index}.rebarFactor`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Facteur d'émission armature</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(parseFloat(value))} defaultValue={field.value?.toString()}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Sélectionnez un facteur" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {rebarOptions.map(r => <SelectItem key={r.name} value={r.factor.toString()}>{r.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          <FormField
                            control={form.control}
                            name={`rawMaterials.${index}.comment`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Commentaires</FormLabel>
                                <FormControl>
                                  <Input placeholder="Hypothèses, détails..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="pt-8">
                          <Button type="button" variant="ghost" size="icon" onClick={() => rmRemove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    )})}
                  </SectionCard>
                </TabsContent>

                <TabsContent value="manufacturing">
                  <SectionCard
                    title="Fabrication"
                    description="Ajoutez les processus impliqués dans la fabrication."
                    icon={Factory}
                    actions={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => mfgAppend({ process: "", value: 0, comment: "" })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un processus
                      </Button>
                    }
                  >
                      {mfgFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucun processus ajouté.</p>}
                      {mfgFields.map((field, index) => {
                        const selectedProcess = watchedManufacturing[index]?.process;
                        const isPaint = selectedProcess === 'Peinture';
                        const label = isPaint ? 'Quantité (kg)' : 'Durée (heures)';
                        const placeholder = isPaint ? 'ex: 10' : 'ex: 50';

                        return (
                          <div key={field.id} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-md border p-4">
                            <div className="flex flex-col gap-4">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                  control={form.control}
                                  name={`manufacturing.${index}.process`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Processus</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Sélectionnez un processus" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {processOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`manufacturing.${index}.value`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{label}</FormLabel>
                                      <FormControl>
                                        <Input type="number" placeholder={placeholder} {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name={`manufacturing.${index}.comment`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Commentaires</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Hypothèses, détails..." {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                              <div className="pt-8">
                              <Button type="button" variant="ghost" size="icon" onClick={() => mfgRemove(index)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                  </SectionCard>
                </TabsContent>

                <TabsContent value="energy">
                  <SectionCard
                    title="Énergie"
                    description="Spécifiez la consommation d'énergie du projet."
                    icon={Zap}
                    actions={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => energyAppend({ source: "", consumption: 0, comment: "" })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une source
                      </Button>
                    }
                  >
                    {energyFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucune source d'énergie ajoutée.</p>}
                    {energyFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-md border p-4">
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`energy.${index}.source`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Source d'énergie</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez une source" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {energyOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`energy.${index}.consumption`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Consommation (heures)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="ex: 100" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name={`energy.${index}.comment`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Commentaires</FormLabel>
                                <FormControl>
                                  <Input placeholder="Hypothèses, détails..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="pt-8">
                          <Button type="button" variant="ghost" size="icon" onClick={() => energyRemove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                </TabsContent>

                <TabsContent value="implementation">
                  <SectionCard
                    title="Mise en œuvre"
                    description="Détaillez les étapes de mise en œuvre sur le chantier."
                    icon={Construction}
                    actions={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => implAppend({ process: "", duration: 0, comment: "" })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un processus
                      </Button>
                    }
                  >
                    {implFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucun processus ajouté.</p>}
                    {implFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-md border p-4">
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`implementation.${index}.process`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Processus</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez un processus" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {implementationOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`implementation.${index}.duration`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Durée (heures)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="ex: 50" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name={`implementation.${index}.comment`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Commentaires</FormLabel>
                                <FormControl>
                                  <Input placeholder="Hypothèses, détails..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="pt-8">
                          <Button type="button" variant="ghost" size="icon" onClick={() => implRemove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                </TabsContent>

                <TabsContent value="transport">
                  <SectionCard
                    title="Transport"
                    description="Détaillez les étapes de transport de votre produit."
                    icon={Truck}
                    actions={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => tptAppend({ mode: "", distance: 0, weight: 0, comment: "" })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une étape
                      </Button>
                    }
                  >
                    {tptFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucune étape de transport ajoutée.</p>}
                    {tptFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-md border p-4">
                         <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField
                              control={form.control}
                              name={`transport.${index}.mode`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Mode</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionnez un mode" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {transportOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`transport.${index}.distance`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Distance (km)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="ex: 500" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`transport.${index}.weight`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Poids (tonnes)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="ex: 10" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                           <FormField
                            control={form.control}
                            name={`transport.${index}.comment`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Commentaires</FormLabel>
                                <FormControl>
                                  <Input placeholder="Hypothèses, détails..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                          <div className="pt-8">
                          <Button type="button" variant="ghost" size="icon" onClick={() => tptRemove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                </TabsContent>
                
            </div>
          </Tabs>

        </div>

        <div className="w-full print-container lg:col-span-1 flex flex-col gap-8">
            <TotalsDisplay totals={totals} details={details} consultationLabel={consultationLabel} />
            <div className="flex flex-col sm:flex-row justify-end gap-2 print:hidden">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFromExcel}
                    accept=".xlsx, .xls"
                    className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Importer bilan
                </Button>
                <Button type="button" variant="outline" onClick={handleExportToExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Générer le bilan (XLS)
                </Button>
            </div>
        </div>
      </div>
    </Form>
  );
}
