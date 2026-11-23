"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Button, Card } from "@/components/ui";
import { useStore } from "@/lib/store";

function SignIn() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/feedback";
  const { auth, signOut } = useStore();

  return (
    <div className="mx-auto grid max-w-md gap-6 py-6">
      <div>
        <h1 className="tl-masuk-title text-ink">Masuk</h1>
        <p className="mt-1 text-sm text-muted">
          Akun dipakai untuk menyimpan feedback atas hasil analisis dan menyetujui usulan perbaikan agent.
        </p>
      </div>
      <Card title={auth?.user ? `Masuk sebagai ${auth.user.name}` : "Akun demo"}>
        {auth?.user ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push(next)}>Lanjut</Button>
            <Button variant="secondary" onClick={() => void signOut()}>Keluar</Button>
          </div>
        ) : (
          <LoginForm onDone={() => router.push(next)} />
        )}
      </Card>
      <p className="text-sm text-muted">
        Hanya ingin mencoba analisis? <Link href="/" className="text-accent-700 hover:underline">Kembali ke beranda</Link>; login tidak diperlukan.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
