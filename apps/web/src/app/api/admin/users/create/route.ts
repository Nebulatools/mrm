import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth";

function normalizeEmpresa(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const email: string | undefined = payload?.email;
  const password: string | undefined = payload?.password;
  const role: "admin" | "user" = payload?.role === "admin" ? "admin" : "user";
  const empresas: string[] = Array.isArray(payload?.empresas)
    ? payload.empresas
    : [];
  const primaryEmpresaRaw: string | null =
    typeof payload?.primaryEmpresa === "string"
      ? payload.primaryEmpresa
      : null;

  if (!email || !email.trim() || !password || !password.trim()) {
    return NextResponse.json(
      { success: false, error: "Email y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  const normalizedEmpresas = Array.from(
    new Set(
      empresas
        .map((e) => normalizeEmpresa(e))
        .filter((e): e is string => !!e)
    )
  );

  const primaryEmpresa = normalizeEmpresa(primaryEmpresaRaw);
  if (primaryEmpresa && !normalizedEmpresas.includes(primaryEmpresa)) {
    normalizedEmpresas.push(primaryEmpresa);
  }

  // Crear usuario en Supabase Auth
  const { data: userResult, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
    });

  if (createError || !userResult?.user) {
    return NextResponse.json(
      {
        success: false,
        error:
          createError?.message ??
          "No se pudo crear el usuario en Supabase Auth",
      },
      { status: 500 }
    );
  }

  const userId = userResult.user.id;

  // Asegurar perfil en user_profiles
  const { error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        id: userId,
        email: email.trim(),
        role,
        empresa: primaryEmpresa ?? null,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return NextResponse.json(
      { success: false, error: profileError.message },
      { status: 500 }
    );
  }

  // Configurar accesos de empresa
  if (normalizedEmpresas.length > 0) {
    const rows = normalizedEmpresas.map((empresa) => ({
      user_id: userId,
      empresa,
      is_primary: primaryEmpresa ? empresa === primaryEmpresa : false,
    }));

    const { error: accessError } = await supabaseAdmin
      .from("user_empresa_access")
      .insert(rows);

    if (accessError) {
      return NextResponse.json(
        { success: false, error: accessError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    userId,
    email: email.trim(),
    role,
    empresas: normalizedEmpresas,
    primaryEmpresa,
  });
}
