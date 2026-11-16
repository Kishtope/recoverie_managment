import Image from "next/image";

// Centers the KishtoPe logo and the auth card on the page.
const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
    {/* SVG served as-is (unoptimized); "light" variant is the one made for light backgrounds. */}
    <Image src="/brand/horizontal-light.svg" alt="KishtoPe" width={180} height={72} priority unoptimized />
    {children}
  </main>
);

export default AuthLayout;
