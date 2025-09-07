import { CarbonConsultForm } from '@/components/carbon-consult-form';
import { Logo } from '@/components/icons';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
        <div className="flex w-full items-center gap-2">
          <a href="#" className="flex items-center gap-2 text-lg font-semibold">
            <Logo className="h-7 w-7 text-primary" />
            <span className="font-headline text-2xl tracking-tight">CarbonConsult</span>
          </a>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="mx-auto grid w-full max-w-7xl gap-2">
          <h1 className="font-headline text-3xl font-semibold">
            Soumission de l'empreinte carbone du fournisseur
          </h1>
          <p className="text-muted-foreground">
            Remplissez le formulaire ci-dessous pour calculer l'empreinte carbone de votre produit et recevoir des suggestions d'amélioration basées sur l'IA.
          </p>
        </div>
        <div className="mx-auto grid w-full max-w-7xl items-start">
          <CarbonConsultForm />
        </div>
      </main>
      <footer className="border-t bg-card/50 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CarbonConsult. Tous droits réservés.
      </footer>
    </div>
  );
}
