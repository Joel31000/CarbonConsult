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
      material: z.string().min(1, "Please select a material."),
      quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
    })
  ),
  manufacturing: z.array(
    z.object({
      process: z.string().min(1, "Please select a process."),
      duration: z.coerce.number().min(0.01, "Duration must be greater than 0."),
    })
  ),
  transport: z.array(
    z.object({
      mode: z.string().min(1, "Please select a transport mode."),
      distance: z.coerce.number().min(0.1, "Distance must be greater than 0."),
      weight: z.coerce.number().min(0.01, "Weight must be greater than 0."),
    })
  ),
  endOfLife: z.array(
    z.object({
      method: z.string().min(1, "Please select a method."),
      weight: z.coerce.number().min(0.01, "Weight must be greater than 0."),
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
    { name: "Materials", co2e: totals.rawMaterials.toFixed(2) },
    { name: "Mfg", co2e: totals.manufacturing.toFixed(2) },
    { name: "Transport", co2e: totals.transport.toFixed(2) },
    { name: "EoL", co2e: totals.endOfLife.toFixed(2) },
  ];

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Emission Summary</CardTitle>
        <CardDescription>Total CO₂e emissions by category.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Grand Total</p>
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
            .map((item) => `${item.quantity}kg of ${item.material}`)
            .join(", ") || "No raw materials specified.",
        manufacturing:
          formData.manufacturing
            .map((item) => `${item.duration} hours of ${item.process}`)
            .join(", ") || "No manufacturing processes specified.",
        transport:
          formData.transport
            .map(
              (item) =>
                `${item.weight}t transported ${item.distance}km by ${item.mode}`
            )
            .join(", ") || "No transport specified.",
        endOfLife:
          formData.endOfLife
            .map((item) => `${item.weight}kg managed by ${item.method}`)
            .join(", ") || "No end-of-life processes specified.",
        usage: "No usage details specified.",
      };

      const result = await getAiSuggestions(input);
      if (result.success) {
        setAiSuggestions(result.suggestions);
      } else {
        toast({
          variant: "destructive",
          title: "AI Suggestion Failed",
          description:
            result.error ||
            "An unexpected error occurred. Please try again.",
        });
      }
    });
  };

  const onSubmit = (values: FormValues) => {
    startSubmitTransition(async () => {
      const result = await saveSubmission(values);
      if (result.success) {
        toast({
          title: "Submission Saved",
          description: "Your carbon footprint data has been saved.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description:
            "There was an error saving your submission. Please try again.",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid w-full grid-cols-1 gap-8 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <Tabs defaultValue="raw-materials" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="raw-materials">
                <Leaf className="mr-2 h-4 w-4" /> Raw Materials
              </TabsTrigger>
              <TabsTrigger value="manufacturing">
                <Factory className="mr-2 h-4 w-4" /> Manufacturing
              </TabsTrigger>
              <TabsTrigger value="transport">
                <Truck className="mr-2 h-4 w-4" /> Transport
              </TabsTrigger>
              <TabsTrigger value="end-of-life">
                <Recycle className="mr-2 h-4 w-4" /> End of Life
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="raw-materials">
              <SectionCard
                title="Raw Materials"
                description="Specify the raw materials used in your product."
                icon={Leaf}
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => rmAppend({ material: "", quantity: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Material
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
                            <FormLabel>Material</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a material" />
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
                            <FormLabel>Quantity (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 100" {...field} />
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
                title="Manufacturing"
                description="Add the processes involved in manufacturing."
                icon={Factory}
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => mfgAppend({ process: "", duration: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Process
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
                            <FormLabel>Process</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a process" />
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
                            <FormLabel>Duration (hours)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 50" {...field} />
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
                description="Detail the transportation stages for your product."
                icon={Truck}
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => tptAppend({ mode: "", distance: 0, weight: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Leg
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
                                  <SelectValue placeholder="Select a mode" />
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
                              <Input type="number" placeholder="e.g., 500" {...field} />
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
                            <FormLabel>Weight (tonnes)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 10" {...field} />
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
                title="End of Life"
                description="Describe the end-of-life treatment for the product."
                icon={Recycle}
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => eolAppend({ method: "", weight: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Method
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
                            <FormLabel>Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a method" />
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
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 100" {...field} />
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
          </Tabs>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-accent" /> AI-Powered Suggestions
              </CardTitle>
              <CardDescription>
                Click the button to get AI-powered suggestions on how to reduce your carbon footprint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPending && (
                <div className="flex items-center justify-center rounded-md border border-dashed p-8">
                  <Loader2 className="mr-2 h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Generating suggestions...</span>
                </div>
              )}
              {aiSuggestions && !isPending && (
                <div className="prose prose-sm max-w-none rounded-md border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap bg-transparent p-0 font-body text-foreground"><p>{aiSuggestions}</p></pre>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 border-t px-6 py-4 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={handleGetSuggestions} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Get AI Suggestions
              </Button>
              <Button type="submit" disabled={isSubmitPending}>
                {isSubmitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Submission
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="w-full">
            <TotalsDisplay totals={totals} />
        </div>
      </form>
    </Form>
  );
}
