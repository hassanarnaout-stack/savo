import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginShowcaseService } from "@/lib/services/login-showcase-service";

/**
 * SAVO Login (Server Component) — resolves the real, admin-controlled
 * Login Showcase Products (LoginShowcaseService) and hands them to the
 * client LoginForm. Zero hardcoded product/image here; a missing slot
 * simply isn't rendered (fail-safe, per LoginShowcaseService).
 */
export default async function LoginPage() {
  const showcase = await LoginShowcaseService.getShowcaseProducts();
  return (
    <Suspense fallback={null}>
      <LoginForm showcase={showcase} />
    </Suspense>
  );
}
