
'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CarbonConsultForm } from '@/components/carbon-consult-form';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Download, HelpCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Home() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportToPDF = async () => {
    setIsExporting(true);
    const input = document.getElementById('printable-area');
    if (input) {
      try {
        const canvas = await html2canvas(input, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null, 
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        let newImgWidth = pdfWidth;
        let newImgHeight = newImgWidth / ratio;

        if (newImgHeight > pdfHeight) {
          newImgHeight = pdfHeight;
          newImgWidth = newImgHeight * ratio;
        }

        const x = (pdfWidth - newImgWidth) / 2;
        const y = 0;

        pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
        pdf.save('bilan-carbone.pdf');
      } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
      } finally {
        setIsExporting(false);
      }
    } else {
      console.error("Element à exporter non trouvé");
      setIsExporting(false);
    }
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 print:hidden">
        <div className="flex w-full items-center justify-between">
          <a href="#" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Logo className="h-7 w-7" />
            <span className="font-headline text-2xl tracking-tight">CarbonConsult</span>
          </a>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleExportToPDF} variant="default" size="default" disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Téléchargement en PDF
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>À propos de CarbonConsult</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-sm text-muted-foreground">
                  <p>
                    CarbonConsult est une application mise à la disposition des fournisseurs pour calculer le bilan carbone de leurs offres lors des consultations.
                  </p>
                  <p>
                    Le périmètre du calcul du bilan carbone est conforme à la méthodologie "Du berceau à la livraison" (Cradle-to-gate). Il prend en compte les postes : Matières, Fabrication et mise en œuvre, Transport et Fin de vie.
                  </p>
                  <p>
                    Le fournisseur implémente progressivement les différents postes qui vont s’additionner automatiquement. Le graphique du bilan carbone permet de visualiser les détails de la répartition de l’empreinte carbone par poste.
                  </p>
                  <p>
                    Le fournisseur peut éditer le bilan de l’empreinte carbone au format PDF et le joindre ainsi aux autres documents constitutifs de son offre.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      <main id="printable-area" className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="mx-auto grid w-full max-w-7xl gap-2 print:hidden">
          <h1 className="font-headline text-3xl font-semibold">
            Données d'Entrée
          </h1>
        </div>
        <div className="mx-auto grid w-full max-w-7xl items-start">
          <CarbonConsultForm />
        </div>
      </main>
      <footer className="border-t border-border/40 bg-background/95 py-4 text-center text-sm text-muted-foreground print:hidden">
        © {new Date().getFullYear()} CarbonConsult. Tous droits réservés.
      </footer>
    </div>
  );
}
