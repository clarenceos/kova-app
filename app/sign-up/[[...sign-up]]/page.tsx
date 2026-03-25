import { SignUp } from "@clerk/nextjs";
import { KovaWordmark } from "@/components/ui/KovaWordmark";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-forge-black px-4 py-12">
      <KovaWordmark height={32} className="text-parchment" />
      <SignUp
        appearance={{
          variables: {
            colorBackground: '#1A1A1A',
            colorInputBackground: '#0D0D0D',
            colorInputText: '#EDE9E2',
            colorText: '#EDE9E2',
            colorTextSecondary: '#7B8C97',
            colorPrimary: '#9A7040',
            colorDanger: '#7B8C97',
            borderRadius: '0.75rem',
            fontFamily: 'inherit',
          },
        }}
      />
    </div>
  );
}
