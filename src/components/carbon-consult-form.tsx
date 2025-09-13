
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
  Loader2,
  PlusCircle,
  Recycle,
  Trash2,
  Truck,
  MessageSquare,
  Sparkles,
  FileUp,
} from "lucide-react";
import { Construction, FileSpreadsheet } from "@/components/icons";
import React, { useMemo, useState, useTransition, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { emissionFactors } from "@/lib/data";
import { Checkbox } from "@/components/ui/checkbox";
import type { SuggestionResponse } from "@/ai/flows/suggest-carbon-improvements";
import { suggestImprovements } from "@/ai/flows/suggest-carbon-improvements";
import { Skeleton } from "./ui/skeleton";

const formSchema = z.object({
  rawMaterials: z.array(
    z.object({
      material: z.string().min(1, "Veuillez sélectionner un matériau."),
      quantity: z.coerce.number().min(0.01, "La quantité doit être supérieure à 0."),
      // Champs spécifiques au béton
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
      duration: z.coerce.number().min(0.01, "La durée doit être supérieure à 0."),
    })
  ),
  implementation: z.array(
    z.object({
      process: z.string().min(1, "Veuillez sélectionner un processus."),
      duration: z.coerce.number().min(0.01, "La durée doit être supérieure à 0."),
    })
  ),
  transport: z.array(
    z.object({
      mode: z.string().min(1, "Veuillez sélectionner un mode de transport."),
      distance: z.coerce.number().min(0.1, "La distance doit être supérieure à 0."),
      weight: z.coerce.number().min(0.01, "Le poids doit être supérieur à 0."),
    })
  ),
  endOfLife: z.array(
    z.object({
      method: z.string().min(1, "Veuillez sélectionner une méthode."),
      weight: z.coerce.number().min(0.01, "Le poids doit être supérieur à 0."),
    })
  ),
  explanatoryComments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const materialOptions = emissionFactors.materials.map((m) => m.name);
const concreteOptions = emissionFactors.concrete.map((c) => c.name);
const rebarOptions = emissionFactors.rebar;
const processOptions = emissionFactors.manufacturing.map((p) => p.name);
const implementationOptions = emissionFactors.implementation.map((i) => i.name);
const transportOptions = emissionFactors.transport.map((t) => t.name);
const eolOptions = emissionFactors.endOfLife.map((e) => e.name);

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
    implementation: number;
    transport: number;
    endOfLife: number;
    grandTotal: number;
  };
  details: {
    rawMaterials: { name: string; co2e: number }[];
    manufacturing: { name: string; co2e: number }[];
    implementation: { name: string; co2e: number }[];
    transport: { name: string; co2e: number }[];
    endOfLife: { name: string; co2e: number }[];
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
        name: "Mise en œuvre",
        ...details.implementation.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Transport",
        ...details.transport.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Fin de vie",
        ...details.endOfLife.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
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
  const [isSuggestionPending, startSuggestionTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawMaterials: [],
      manufacturing: [],
      implementation: [],
      transport: [],
      endOfLife: [],
      explanatoryComments: "",
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
  const { fields: implFields, append: implAppend, remove: implRemove } = useFieldArray({
    control: form.control,
    name: "implementation",
  });
  const { fields: tptFields, append: tptAppend, remove: tptRemove } = useFieldArray({
    control: form.control,
    name: "transport",
  });
  const { fields: eolFields, append: eolAppend, remove: eolRemove } = useFieldArray({
    control: form.control,
    name: "endOfLife",
  });

  const watchedValues = useWatch({ control: form.control });
  const watchedRawMaterials = useWatch({ control: form.control, name: "rawMaterials" });

  const calculateEmissions = (values: FormValues) => {
    const rmDetails = values.rawMaterials?.map(item => {
      let co2e = 0;
      let name = item.material || "Inconnu";
      
      if (item.material === "Béton") {
        name = item.concreteType || "Béton";
        const quantity = item.quantity || 0;
        const cementMass = item.cementMass || 0;
        const concreteFactor = emissionFactors.concrete.find(c => c.name === item.concreteType)?.factor || 0;
        
        // Calcul pour le béton (ciment)
        // Le facteur est en kgCO2eq/kg de ciment. Masse de ciment en kg/m³. Quantité en m³.
        const cementCO2e = (quantity * cementMass) * concreteFactor;
        co2e += cementCO2e;
        
        // Calcul pour l'armature si applicable
        if (item.isReinforced) {
          const rebarMass = item.rebarMass || 0;
          const rebarFactorValue = item.rebarFactor || 0;
          // Le facteur est en kgCO2eq/kg d'armature. Masse de ferraillage en kg/m³. Quantité en m³.
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
      return { name: item.process || "Inconnu", co2e: (item.duration || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const implDetails = values.implementation?.map(item => {
      const factor = emissionFactors.implementation.find(i => i.name === item.process)?.factor || 0;
      return { name: item.process || "Inconnu", co2e: (item.duration || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const tptDetails = values.transport?.map(item => {
      const factor = emissionFactors.transport.find(t => t.name === item.mode)?.factor || 0;
      return { name: item.mode || "Inconnu", co2e: (item.distance || 0) * (item.weight || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const eolDetails = values.endOfLife?.map(item => {
      const factor = emissionFactors.endOfLife.find(e => e.name === item.method)?.factor || 0;
      return { name: item.method || "Inconnu", co2e: (item.weight || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const rmTotal = rmDetails.reduce((sum, item) => sum + item.co2e, 0);
    const mfgTotal = mfgDetails.reduce((sum, item) => sum + item.co2e, 0);
    const implTotal = implDetails.reduce((sum, item) => sum + item.co2e, 0);
    const tptTotal = tptDetails.reduce((sum, item) => sum + item.co2e, 0);
    const eolTotal = eolDetails.reduce((sum, item) => sum + item.co2e, 0);

    return {
      totals: {
        rawMaterials: rmTotal,
        manufacturing: mfgTotal,
        implementation: implTotal,
        transport: tptTotal,
        endOfLife: eolTotal,
        grandTotal: rmTotal + mfgTotal + implTotal + tptTotal + eolTotal,
      },
      details: {
        rawMaterials: rmDetails,
        manufacturing: mfgDetails,
        implementation: implDetails,
        transport: tptDetails,
        endOfLife: eolDetails,
      }
    };
  };

  const { totals, details } = useMemo(() => calculateEmissions(watchedValues as FormValues), [watchedValues]);

  const handleExportToExcel = () => {
    const data = form.getValues();
    const { totals: calculatedTotals, details: calculatedDetails } = calculateEmissions(data);
    
    const thStyle = 'background-color: #f2f2f2; font-weight: bold; padding: 8px; border: 1px solid #ddd;';
    const tdStyle = 'padding: 8px; border: 1px solid #ddd; text-align: left;';
    const numStyle = 'padding: 8px; border: 1px solid #ddd; text-align: right;';

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset='UTF-8'><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Bilan Carbone</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
            table, th, td { border-collapse: collapse; }
            .num { mso-number-format:"0.00"; }
        </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th style="${thStyle}">Rubriques</th>
                <th style="${thStyle}">Méthodes</th>
                <th style="${thStyle}">Unité</th>
                <th style="${thStyle}">Quantité</th>
                <th style="${thStyle}">Facteur d'émission (kg CO²e)</th>
                <th style="${thStyle}">Masse ciment (kg/m³)</th>
                <th style="${thStyle}">Facteur d'émission armature (kg CO²e)</th>
                <th style="${thStyle}">Masse de ferraillage (kg/m³)</th>
                <th style="${thStyle}">Poids (tonnes)</th>
                <th style="${thStyle}">Kg CO²e</th>
              </tr>
            </thead>
            <tbody>
    `;

    const addRow = (rubrique: string, item: any, co2e: number) => {
        let quantityDisplay = '';
        let unitDisplay = '';
        let weightDisplay = '';
        
        if (rubrique === 'Fin de vie' || (rubrique === '' && item.method)) {
            quantityDisplay = (Number(item.weight) || 0).toFixed(2);
            unitDisplay = 'kg';
        } else if (rubrique === 'Matériaux' || (rubrique === '' && item.material)) {
            quantityDisplay = (Number(item.quantity) || 0).toFixed(2);
            unitDisplay = item.material === 'Béton' ? 'm³' : 'kg';
        } else if (rubrique === 'Fabrication' || (rubrique === '' && item.process && data.manufacturing.includes(item))) {
            quantityDisplay = (Number(item.duration) || 0).toFixed(2);
            unitDisplay = 'H';
        } else if (rubrique === 'Mise en œuvre' || (rubrique === '' && item.process && data.implementation.includes(item))) {
            quantityDisplay = (Number(item.duration) || 0).toFixed(2);
            unitDisplay = 'H';
        } else if (rubrique === 'Transport' || (rubrique === '' && item.mode)) {
            quantityDisplay = (Number(item.distance) || 0).toFixed(2);
            unitDisplay = 'km';
            weightDisplay = (Number(item.weight) || 0).toFixed(2);
        }
        
        let emissionFactorDisplay = '';
        let cementMassDisplay = '';
        let rebarFactorDisplay = '';
        let rebarMassDisplay = '';
        let methodName = item.material || item.process || item.mode || item.method;
        
        if (rubrique === 'Matériaux' || (rubrique === '' && item.material)) {
            if (item.material === "Béton") {
                methodName = item.concreteType || "Béton";
                const concreteFactor = emissionFactors.concrete.find(c => c.name === item.concreteType)?.factor || 0;
                emissionFactorDisplay = concreteFactor.toFixed(3);
                cementMassDisplay = (Number(item.cementMass) || 0).toFixed(2);
                if (item.isReinforced) {
                    methodName += " armé";
                    rebarFactorDisplay = (Number(item.rebarFactor) || 0).toFixed(2);
                    rebarMassDisplay = (Number(item.rebarMass) || 0).toFixed(2);
                }
            } else if (item.material) {
                const factor = emissionFactors.materials.find(m => m.name === item.material)?.factor || 0;
                emissionFactorDisplay = factor.toFixed(2);
            }
        } else if (rubrique === 'Fabrication' || (rubrique === '' && item.process && data.manufacturing.includes(item))) {
            const factor = emissionFactors.manufacturing.find(m => m.name === item.process)?.factor || 0;
            emissionFactorDisplay = factor.toFixed(2);
        } else if (rubrique === 'Mise en œuvre' || (rubrique === '' && item.process && data.implementation.includes(item))) {
            const factor = emissionFactors.implementation.find(m => m.name === item.process)?.factor || 0;
            emissionFactorDisplay = factor.toFixed(2);
        } else if (rubrique === 'Transport' || (rubrique === '' && item.mode)) {
            const factor = emissionFactors.transport.find(m => m.name === item.mode)?.factor || 0;
            emissionFactorDisplay = factor.toFixed(4);
        } else if (rubrique === 'Fin de vie' || (rubrique === '' && item.method)) {
            const factor = emissionFactors.endOfLife.find(m => m.name === item.method)?.factor || 0;
            emissionFactorDisplay = factor.toFixed(2);
             if (item.method) {
                const eolFactor = emissionFactors.endOfLife.find(e => e.name === item.method);
                if (eolFactor && eolFactor.unit.includes('/t-km')) { // Hypothetical example
                    unitDisplay = 't';
                } else {
                    unitDisplay = 'kg';
                }
            }
        }

        tableHtml += `
            <tr>
                <td style="${tdStyle}">${rubrique}</td>
                <td style="${tdStyle}">${methodName}</td>
                <td style="${tdStyle}">${unitDisplay}</td>
                <td style="${numStyle}" class="num">${quantityDisplay}</td>
                <td style="${numStyle}" class="num">${emissionFactorDisplay}</td>
                <td style="${numStyle}" class="num">${cementMassDisplay}</td>
                <td style="${numStyle}" class="num">${rebarFactorDisplay}</td>
                <td style="${numStyle}" class="num">${rebarMassDisplay}</td>
                <td style="${numStyle}" class="num">${weightDisplay}</td>
                <td style="${numStyle}" class="num">${co2e.toFixed(2)}</td>
            </tr>
        `;
    };
    
    data.rawMaterials?.forEach((item, index) => {
        let name = item.material;
        if (item.material === "Béton") {
            name = item.concreteType || "Béton";
            if (item.isReinforced) name += " armé";
        }
        
        const co2eItem = calculatedDetails.rawMaterials.find(d => {
             // More robust matching for reinforced concrete
            if (item.material === "Béton") {
                const baseName = item.concreteType || "Béton";
                const expectedName = item.isReinforced ? `${baseName} armé` : baseName;
                return d.name === expectedName;
            }
            return d.name === item.material;
        });

        addRow(index === 0 ? 'Matériaux' : '', item, co2eItem?.co2e || 0);
    });

    data.manufacturing?.forEach((item, index) => {
        const co2eItem = calculatedDetails.manufacturing.find(d => d.name === item.process);
        addRow(index === 0 ? 'Fabrication' : '', item, co2eItem?.co2e || 0);
    });

    data.implementation?.forEach((item, index) => {
        const co2eItem = calculatedDetails.implementation.find(d => d.name === item.process);
        addRow(index === 0 ? 'Mise en œuvre' : '', item, co2eItem?.co2e || 0);
    });

    data.transport?.forEach((item, index) => {
        const co2eItem = calculatedDetails.transport.find(d => d.name === item.mode);
        addRow(index === 0 ? 'Transport' : '', item, co2eItem?.co2e || 0);
    });

    data.endOfLife?.forEach((item, index) => {
        const co2eItem = calculatedDetails.endOfLife.find(d => d.name === item.method);
        addRow(index === 0 ? 'Fin de vie' : '', item, co2eItem?.co2e || 0);
    });

    // Total row
    tableHtml += `
            <tr>
                <td colspan="9" style="${thStyle}">Total</td>
                <td style="${thStyle} text-align: right;" class="num">${calculatedTotals.grandTotal.toFixed(2)}</td>
            </tr>
    `;

    tableHtml += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `bilan_carbone_${consultationLabel.replace(/ /g, '_') || 'export'}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
        title: "Exportation réussie",
        description: "Le fichier du bilan carbone a été téléchargé.",
    });
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
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            const newValues: FormValues = {
                rawMaterials: [],
                manufacturing: [],
                implementation: [],
                transport: [],
                endOfLife: [],
                explanatoryComments: form.getValues('explanatoryComments') // Conserver les commentaires
            };

            let currentSection = '';
            json.forEach(row => {
                const section = row['Rubriques']?.trim();
                if (section && section !== 'Total') {
                    currentSection = section;
                }

                const methodName = row['Méthodes']?.trim();
                if (!methodName) return;
                
                const quantity = Number(row['Quantité']) || 0;

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
                        } else if (!materialOptions.includes(methodName) && concreteOptions.includes(methodName)) {
                            // C'est probablement un type de béton qui n'a pas été marqué comme armé
                            material = "Béton";
                            concreteType = methodName;
                        }
                        
                        newValues.rawMaterials.push({
                            material: material,
                            quantity: quantity,
                            concreteType: concreteType,
                            cementMass: Number(row['Masse ciment (kg/m³)']) || undefined,
                            isReinforced: isReinforced,
                            rebarMass: Number(row['Masse de ferraillage (kg/m³)']) || undefined,
                            rebarFactor: Number(row["Facteur d'émission armature (kg CO²e)"]) || undefined,
                        });
                        break;
                    }
                    case 'Fabrication':
                        newValues.manufacturing.push({
                            process: methodName,
                            duration: quantity,
                        });
                        break;
                    case 'Mise en œuvre':
                        newValues.implementation.push({
                            process: methodName,
                            duration: quantity,
                        });
                        break;
                    case 'Transport':
                        newValues.transport.push({
                            mode: methodName,
                            distance: quantity,
                            weight: Number(row['Poids (tonnes)']) || 0,
                        });
                        break;
                    case 'Fin de vie':
                         newValues.endOfLife.push({
                            method: methodName,
                            weight: quantity,
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
            // Réinitialiser le file input pour permettre une nouvelle importation du même fichier
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleGetSuggestions = async () => {
    startSuggestionTransition(async () => {
      setSuggestion(null);
      const values = form.getValues();
      const { totals, details } = calculateEmissions(values);

      if (totals.grandTotal === 0) {
        toast({
          variant: "destructive",
          title: "Analyse impossible",
          description: "Veuillez entrer des données avant de demander une suggestion.",
        });
        return;
      }
      
      try {
        const result = await suggestImprovements({
          summary: {
            totalEmissions: totals.grandTotal,
            materialEmissions: totals.rawMaterials,
            manufacturingEmissions: totals.manufacturing,
            implementationEmissions: totals.implementation,
            transportEmissions: totals.transport,
            endOfLifeEmissions: totals.endOfLife,
          },
          details: {
            materials: details.rawMaterials.map(m => `${m.name}: ${m.co2e.toFixed(2)} kgCO2e`),
            manufacturing: details.manufacturing.map(m => `${m.name}: ${m.co2e.toFixed(2)} kgCO2e`),
            implementation: details.implementation.map(m => `${m.name}: ${m.co2e.toFixed(2)} kgCO2e`),
            transport: details.transport.map(m => `${m.name}: ${m.co2e.toFixed(2)} kgCO2e`),
            endOfLife: details.endOfLife.map(m => `${m.name}: ${m.co2e.toFixed(2)} kgCO2e`),
          },
          comments: values.explanatoryComments || ""
        });
        setSuggestion(result);
      } catch (error) {
        console.error("Erreur lors de la suggestion d'améliorations:", error);
        toast({
          variant: "destructive",
          title: "Service IA indisponible",
          description: "Le service est momentanément surchargé. Veuillez réessayer dans quelques instants.",
        });
      }
    });
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
              <TabsTrigger value="implementation">
                <Construction className="mr-2 h-4 w-4" /> Mise en œuvre
              </TabsTrigger>
              <TabsTrigger value="transport">
                <Truck className="mr-2 h-4 w-4" /> Transport
              </TabsTrigger>
              <TabsTrigger value="end-of-life">
                <Recycle className="mr-2 h-4 w-4" /> Fin de vie
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
                          concreteType: "",
                          cementMass: undefined,
                          isReinforced: false,
                          rebarMass: undefined,
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
                                      <Input type="number" placeholder="ex: 300" {...field} />
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
                                      <Input type="number" placeholder="ex: 100" {...field} />
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
                        onClick={() => mfgAppend({ process: "", duration: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un processus
                      </Button>
                    }
                  >
                      {mfgFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucun processus ajouté.</p>}
                      {mfgFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-[1fr_auto_auto] items-start gap-4 rounded-md border p-4">
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
                            name={`manufacturing.${index}.duration`}
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
                          <div className="pt-8">
                          <Button type="button" variant="ghost" size="icon" onClick={() => mfgRemove(index)}>
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
                        onClick={() => implAppend({ process: "", duration: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un processus
                      </Button>
                    }
                  >
                    {implFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucun processus ajouté.</p>}
                    {implFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-[1fr_auto_auto] items-start gap-4 rounded-md border p-4">
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
                        onClick={() => tptAppend({ mode: "", distance: 0, weight: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une étape
                      </Button>
                    }
                  >
                    {tptFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucune étape de transport ajoutée.</p>}
                    {tptFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-md border p-4">
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
                          <div className="pt-8">
                          <Button type="button" variant="ghost" size="icon" onClick={() => tptRemove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                </TabsContent>
                
                <TabsContent value="end-of-life">
                  <SectionCard
                    title="Fin de vie"
                    description="Décrivez le traitement de fin de vie du produit."
                    icon={Recycle}
                    actions={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eolAppend({ method: "", weight: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une méthode
                      </Button>
                    }
                  >
                    {eolFields.length === 0 && <p className="text-sm text-center text-muted-foreground pt-4">Aucune méthode ajoutée.</p>}
                    {eolFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-[1fr_auto_auto] items-start gap-4 rounded-md border p-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`endOfLife.${index}.method`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Méthode</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionnez une méthode" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {eolOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`endOfLife.${index}.weight`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Poids (kg)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="ex: 100" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="pt-8">
                          <Button type="button" variant="ghost" size="icon" onClick={() => eolRemove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                </TabsContent>
            </div>
          </Tabs>
          
          <SectionCard
              title="Commentaires explicatifs"
              description="Ajoutez des commentaires, des hypothèses ou toute autre information pertinente."
              icon={MessageSquare}
              actions={<></>}
          >
              <FormField
                  control={form.control}
                  name="explanatoryComments"
                  render={({ field }) => (
                      <FormItem>
                          <FormControl>
                              <Textarea
                                  placeholder="Saisissez vos commentaires ici..."
                                  className="min-h-[120px]"
                                  {...field}
                              />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
          </SectionCard>

          <SectionCard
            title="Suggestions d'amélioration"
            description="Laissez l'IA analyser votre bilan et proposer des pistes d'optimisation."
            icon={Sparkles}
            actions={
              <Button type="button" variant="outline" size="sm" onClick={handleGetSuggestions} disabled={isSuggestionPending}>
                {isSuggestionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Obtenir des suggestions
              </Button>
            }
          >
            {isSuggestionPending && (
              <div className="space-y-2 pt-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            {suggestion && !isSuggestionPending && (
              <div className="space-y-4 pt-4 text-sm">
                <p><strong>Bilan de l'IA :</strong> {suggestion.assessment}</p>
                <div className="prose prose-sm prose-invert max-w-none">
                  <strong>Recommandations :</strong>
                  <ul>
                    {suggestion.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {!suggestion && !isSuggestionPending && (
              <p className="text-sm text-center text-muted-foreground pt-4">Aucune suggestion pour le moment.</p>
            )}
          </SectionCard>
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

    