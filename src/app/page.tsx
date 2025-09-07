
'use client';

import { CarbonConsultForm } from '@/components/carbon-consult-form';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function Home() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6 print:hidden">
        <div className="flex w-full items-center justify-between">
          <a href="#" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Logo className="h-7 w-7" />
            <span className="font-headline text-2xl tracking-tight">CarbonConsult</span>
          </a>
          <Button type="button" onClick={handlePrint} variant="default" size="default">
            <Download className="mr-2 h-4 w-4" />
            Téléchargement en PDF
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
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
