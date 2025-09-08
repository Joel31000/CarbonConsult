
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
} from "lucide-react";
import React, { useMemo, useState, useTransition } from "react";
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
import { saveSubmission } from "@/lib/actions";
import { emissionFactors } from "@/lib/data";

const formSchema = z.object({
  rawMaterials: z.array(
    z.object({
      material: z.string().min(1, "Veuillez sélectionner un matériau."),
      quantity: z.coerce.number().min(0.01, "La quantité doit être supérieure à 0."),
    })
  ),
  manufacturing: z.array(
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
const processOptions = emissionFactors.manufacturing.map((p) => p.name);
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
    transport: number;
    endOfLife: number;
    grandTotal: number;
  };
  details: {
    rawMaterials: { name: string; co2e: number }[];
    manufacturing: { name: string; co2e: number }[];
    transport: { name: string; co2e: number }[];
    endOfLife: { name: string; co2e: number }[];
  };
}) => {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    let colorIndex = 0;
    
    Object.values(details).flat().forEach(item => {
      if (!config[item.name]) {
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
    return [
      {
        name: "Matériaux",
        ...details.rawMaterials.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Fabrication",
        ...details.manufacturing.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Transport",
        ...details.transport.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
      {
        name: "Fin de vie",
        ...details.endOfLife.reduce((acc, item) => ({ ...acc, [item.name]: item.co2e }), {})
      },
    ]
  }, [details]);
  

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <CardTitle>Résumé des émissions</CardTitle>
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
        </div>
      </CardContent>
    </Card>
  );
};

export function CarbonConsultForm({ consultationLabel }: { consultationLabel: string }) {
  const { toast } = useToast();
  const [isSubmitPending, startSubmitTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawMaterials: [{ material: "", quantity: 0 }],
      manufacturing: [],
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
  const { fields: tptFields, append: tptAppend, remove: tptRemove } = useFieldArray({
    control: form.control,
    name: "transport",
  });
  const { fields: eolFields, append: eolAppend, remove: eolRemove } = useFieldArray({
    control: form.control,
    name: "endOfLife",
  });

  const watchedValues = useWatch({ control: form.control });

  const { totals, details } = useMemo(() => {
    const rmDetails = watchedValues.rawMaterials?.map(item => {
      const factor = emissionFactors.materials.find(m => m.name === item.material)?.factor || 0;
      return { name: item.material || "Inconnu", co2e: (item.quantity || 0) * factor };
    }).filter(item => item.co2e > 0) || [];
    
    const mfgDetails = watchedValues.manufacturing?.map(item => {
      const factor = emissionFactors.manufacturing.find(p => p.name === item.process)?.factor || 0;
      return { name: item.process || "Inconnu", co2e: (item.duration || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const tptDetails = watchedValues.transport?.map(item => {
      const factor = emissionFactors.transport.find(t => t.name === item.mode)?.factor || 0;
      return { name: item.mode || "Inconnu", co2e: (item.distance || 0) * (item.weight || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const eolDetails = watchedValues.endOfLife?.map(item => {
      const factor = emissionFactors.endOfLife.find(e => e.name === item.method)?.factor || 0;
      return { name: item.method || "Inconnu", co2e: (item.weight || 0) * factor };
    }).filter(item => item.co2e > 0) || [];

    const rmTotal = rmDetails.reduce((sum, item) => sum + item.co2e, 0);
    const mfgTotal = mfgDetails.reduce((sum, item) => sum + item.co2e, 0);
    const tptTotal = tptDetails.reduce((sum, item) => sum + item.co2e, 0);
    const eolTotal = eolDetails.reduce((sum, item) => sum + item.co2e, 0);

    return {
      totals: {
        rawMaterials: rmTotal,
        manufacturing: mfgTotal,
        transport: tptTotal,
        endOfLife: eolTotal,
        grandTotal: rmTotal + mfgTotal + tptTotal + eolTotal,
      },
      details: {
        rawMaterials: rmDetails,
        manufacturing: mfgDetails,
        transport: tptDetails,
        endOfLife: eolDetails,
      }
    };
  }, [watchedValues]);

  const onSubmit = (values: FormValues) => {
    startSubmitTransition(async () => {
      const result = await saveSubmission(values);
      if (result.success) {
        toast({
          title: "Soumission enregistrée",
          description: "Vos données d'empreinte carbone ont été enregistrées.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Échec de l'enregistrement",
          description:
            "Une erreur s'est produite lors de l'enregistrement de votre soumission. Veuillez réessayer.",
        });
      }
    });
  };

  return (
    <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-8"
          >
            <Tabs defaultValue="raw-materials" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 print:hidden">
                <TabsTrigger value="raw-materials">
                  <Leaf className="mr-2 h-4 w-4" /> Matières premières
                </TabsTrigger>
                <TabsTrigger value="manufacturing">
                  <Factory className="mr-2 h-4 w-4" /> Fabrication
                </TabsTrigger>
                <TabsTrigger value="transport">
                  <Truck className="mr-2 h-4 w-4" /> Transport
                </TabsTrigger>
                <TabsTrigger value="end-of-life">
                  <Recycle className="mr-2 h-4 w-4" /> Fin de vie
                </TabsTrigger>
              </TabsList>
              
              <div className="print:hidden">
                  <TabsContent value="raw-materials">
                    <SectionCard
                      title="Matières premières"
                      description="Spécifiez les matières premières utilisées dans votre produit."
                      icon={Leaf}
                      actions={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => rmAppend({ material: "", quantity: 0 })}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un matériau
                        </Button>
                      }
                    >
                      {rmFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-[1fr_auto_auto] items-start gap-4 rounded-md border p-4">
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
                                  <FormLabel>Quantité (kg)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="ex: 100" {...field} />
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
                      ))}
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

            <div className="flex justify-end print:hidden">
                <Button type="submit" disabled={isSubmitPending}>
                  {isSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer la soumission
                </Button>
            </div>
          </form>
        </Form>
      </div>
      <div className="w-full print-container lg:col-span-1">
          <TotalsDisplay totals={totals} details={details} consultationLabel={consultationLabel} />
      </div>
    </div>
  );
}

    