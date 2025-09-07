
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
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
  Wand2,
} from "lucide-react";
import React, { useEffect, useMemo, useState, useTransition } from "react";
import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Bar,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { getAiSuggestions, saveSubmission } from "@/lib/actions";
import { emissionFactors } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { SuggestCarbonImprovementsInput } from "@/ai/flows/suggest-carbon-improvements";
import { useToast } from "@/hooks/use-toast";

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
  totals,
}: {
  totals: {
    rawMaterials: number;
    manufacturing: number;
    transport: number;
    endOfLife: number;
    grandTotal: number;
  };
}) => {
  const chartData = [
    { name: "Matériaux", co2e: totals.rawMaterials.toFixed(2) },
    { name: "Fab.", co2e: totals.manufacturing.toFixed(2) },
    { name: "Transport", co2e: totals.transport.toFixed(2) },
    { name: "FdF", co2e: totals.endOfLife.toFixed(2) },
  ];

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Résumé des émissions</CardTitle>
        <CardDescription>Émissions totales de CO₂e par catégorie.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total général</p>
          <p className="text-4xl font-bold tracking-tighter">
            {totals.grandTotal.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">kg CO₂e</p>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} unit="kg" />
              <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{backgroundColor: 'hsl(var(--card))'}} />
              <Bar dataKey="co2e" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export function CarbonConsultForm() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSubmitPending, startSubmitTransition] = useTransition();
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawMaterials: [{ material: "", quantity: 0 }],
      manufacturing: [],
      transport: [],
      endOfLife: [],
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

  const totals = useMemo(() => {
    const rmTotal =
      watchedValues.rawMaterials?.reduce((sum, item) => {
        const factor =
          emissionFactors.materials.find((m) => m.name === item.material)
            ?.factor || 0;
        return sum + (item.quantity || 0) * factor;
      }, 0) || 0;

    const mfgTotal =
      watchedValues.manufacturing?.reduce((sum, item) => {
        const factor =
          emissionFactors.manufacturing.find((m) => m.name === item.process)
            ?.factor || 0;
        return sum + (item.duration || 0) * factor;
      }, 0) || 0;

    const tptTotal =
      watchedValues.transport?.reduce((sum, item) => {
        const factor =
          emissionFactors.transport.find((m) => m.name === item.mode)
            ?.factor || 0;
        return sum + (item.distance || 0) * (item.weight || 0) * factor;
      }, 0) || 0;

    const eolTotal =
      watchedValues.endOfLife?.reduce((sum, item) => {
        const factor =
          emissionFactors.endOfLife.find((m) => m.name === item.method)
            ?.factor || 0;
        return sum + (item.weight || 0) * factor;
      }, 0) || 0;

    return {
      rawMaterials: rmTotal,
      manufacturing: mfgTotal,
      transport: tptTotal,
      endOfLife: eolTotal,
      grandTotal: rmTotal + mfgTotal + tptTotal + eolTotal,
    };
  }, [watchedValues]);

  const handleGetSuggestions = () => {
    startTransition(async () => {
      setAiSuggestions(null);
      const formData = form.getValues();
      const input: SuggestCarbonImprovementsInput = {
        rawMaterials:
          formData.rawMaterials
            .map((item) => `${item.quantity}kg de ${item.material}`)
            .join(", ") || "Aucune matière première spécifiée.",
        manufacturing:
          formData.manufacturing
            .map((item) => `${item.duration} heures de ${item.process}`)
            .join(", ") || "Aucun processus de fabrication spécifié.",
        transport:
          formData.transport
            .map(
              (item) =>
                `${item.weight}t transportées sur ${item.distance}km par ${item.mode}`
            )
            .join(", ") || "Aucun transport spécifié.",
        endOfLife:
          formData.endOfLife
            .map((item) => `${item.weight}kg gérés par ${item.method}`)
            .join(", ") || "Aucun processus de fin de vie spécifié.",
        usage: "Aucun détail d'utilisation spécifié.",
      };

      const result = await getAiSuggestions(input);
      if (result.success && result.suggestions) {
        setAiSuggestions(result.suggestions);
      } else {
        toast({
          variant: "destructive",
          title: "Échec de la suggestion de l'IA",
          description:
            result.error ||
            "Une erreur inattendue est survenue. Veuillez réessayer.",
        });
      }
    });
  };

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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-accent" /> Suggestions de l'IA
                </CardTitle>
                <CardDescription>
                  Cliquez sur le bouton pour obtenir des suggestions de l'IA sur la façon de réduire votre empreinte carbone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isPending && (
                  <div className="flex items-center justify-center rounded-md border border-dashed p-8">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Génération des suggestions...</span>
                  </div>
                )}
                {aiSuggestions && !isPending && (
                  <div className="prose prose-sm max-w-none rounded-md border bg-muted/50 p-4">
                      <p className="whitespace-pre-wrap font-body text-foreground">{aiSuggestions}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="button" variant="outline" onClick={handleGetSuggestions} disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Obtenir les suggestions de l'IA
                </Button>
              </CardFooter>
            </Card>
            
            <div className="flex justify-end print:hidden">
                <Button type="submit" disabled={isSubmitPending}>
                  {isSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer la soumission
                </Button>
            </div>
          </form>
        </Form>
      </div>
      <div className="w-full print-container">
          <TotalsDisplay totals={totals} />
      </div>
    </div>
  );
}
