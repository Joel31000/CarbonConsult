
'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CarbonConsultForm } from '@/components/carbon-consult-form';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

export default function Home() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportToPDF = async () => {
    setIsExporting(true);
    const input = document.getElementById('printable-area');
    if (input) {
      try {
        // Temporairement rendre les éléments cachés à l'impression visibles pour la capture
        const hiddenElements = input.querySelectorAll('.print\\:hidden');
        hiddenElements.forEach(el => el.classList.remove('print:hidden'));

        const canvas = await html2canvas(input, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null, 
        });
        
        // Rétablir les classes après la capture
        hiddenElements.forEach(el => el.classList.add('print:hidden'));

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
        const y = 0; // Commencer en haut de la page

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
          <Button type="button" onClick={handleExportToPDF} variant="default" size="default" disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Téléchargement en PDF
          </Button>
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
