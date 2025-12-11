import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/server-auth";

type WhitelistUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  empresa: string | null;
};

type EmpresaAccessRow = {
  user_id: string;
  empresa: string;
  is_primary: boolean;
};

function normalizeEmpresa(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return auth.error;
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, role, empresa")
    .order("email", { ascending: true })
    .returns<WhitelistUser[]>();

  if (profilesError) {
    return NextResponse.json(
      { success: false, error: profilesError.message },
      { status: 500 }
    );
  }

  const { data: accessRows, error: accessError } = await supabaseAdmin
    .from("user_empresa_access")
    .select("user_id, empresa, is_primary")
    .returns<EmpresaAccessRow[]>();

  if (accessError) {
    return NextResponse.json(
      { success: false, error: accessError.message },
      { status: 500 }
    );
  }

  const byUser = new Map<
    string,
    { empresas: Set<string>; primary: string | null }
  >();

  for (const row of accessRows ?? []) {
    const empresa = normalizeEmpresa(row.empresa);
    if (!empresa) continue;
    let entry = byUser.get(row.user_id);
    if (!entry) {
      entry = { empresas: new Set<string>(), primary: null };
      byUser.set(row.user_id, entry);
    }
    entry.empresas.add(empresa);
    if (row.is_primary) {
      entry.primary = empresa;
    }
  }

  // Empresas disponibles: combinar catálogo desde empleados_sftp + accesos configurados
  const empresasSet = new Set<string>();

  // 1) Desde empleados_sftp (plantilla real)
  {
    const { data: empresasRows, error: empresasError } = await supabaseAdmin
      .from("empleados_sftp")
      .select("empresa");

    if (empresasError) {
      return NextResponse.json(
        { success: false, error: empresasError.message },
        { status: 500 }
      );
    }

    for (const row of empresasRows ?? []) {
      const empresa = normalizeEmpresa((row as any).empresa ?? null);
      if (empresa) {
        empresasSet.add(empresa);
      }
    }
  }

  // 2) Desde user_empresa_access (por si hay empresas configuradas sin datos aún)
  for (const row of accessRows ?? []) {
    const empresa = normalizeEmpresa(row.empresa);
    if (empresa) {
      empresasSet.add(empresa);
    }
  }

  const empresas = Array.from(empresasSet).sort((a, b) => a.localeCompare(b));

  const users = (profiles ?? []).map((profile) => {
    const access = byUser.get(profile.id);
    const allowedEmpresas = access
      ? Array.from(access.empresas).sort((a, b) => a.localeCompare(b))
      : profile.empresa
        ? [profile.empresa]
        : [];
    const primaryEmpresa =
      access?.primary ??
      (allowedEmpresas.length > 0 ? allowedEmpresas[0] : null);

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      empresa: profile.empresa,
      primaryEmpresa,
      allowedEmpresas,
    };
  });

  return NextResponse.json({
    success: true,
    users,
    empresas,
  });
}

export async function PUT(request: NextRequest) {
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

  const userId: string | undefined = payload?.userId;
  const role: "admin" | "user" | undefined = payload?.role;
  const empresas: string[] = Array.isArray(payload?.empresas)
    ? payload.empresas
    : [];

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "userId is required" },
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

  // Empresa principal interna: simplemente la primera de la lista (si existe)
  const primaryEmpresa = normalizedEmpresas[0] ?? null;

  // Actualizar perfil (empresa primaria y rol)
  const profileUpdate: Record<string, any> = {};
  if (typeof role === "string") {
    profileUpdate.role = role;
  }
  profileUpdate.empresa = primaryEmpresa ?? null;

  const { error: updateProfileError } = await supabaseAdmin
    .from("user_profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (updateProfileError) {
    return NextResponse.json(
      { success: false, error: updateProfileError.message },
      { status: 500 }
    );
  }

  // Reemplazar accesos de empresas para el usuario
  const { error: deleteAccessError } = await supabaseAdmin
    .from("user_empresa_access")
    .delete()
    .eq("user_id", userId);

  if (deleteAccessError) {
    return NextResponse.json(
      { success: false, error: deleteAccessError.message },
      { status: 500 }
    );
  }

  if (normalizedEmpresas.length > 0) {
    const rows = normalizedEmpresas.map((empresa) => ({
      user_id: userId,
      empresa,
      is_primary: primaryEmpresa ? empresa === primaryEmpresa : false,
    }));

    const { error: insertAccessError } = await supabaseAdmin
      .from("user_empresa_access")
      .insert(rows);

    if (insertAccessError) {
      return NextResponse.json(
        { success: false, error: insertAccessError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
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

  const userId: string | undefined = payload?.userId;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "userId is required" },
      { status: 400 }
    );
  }

  // Limpiar accesos de empresa
  const { error: deleteAccessError } = await supabaseAdmin
    .from("user_empresa_access")
    .delete()
    .eq("user_id", userId);

  if (deleteAccessError) {
    return NextResponse.json(
      { success: false, error: deleteAccessError.message },
      { status: 500 }
    );
  }

  // Desasignar empresa principal en perfil, pero mantener rol
  const { error: updateProfileError } = await supabaseAdmin
    .from("user_profiles")
    .update({ empresa: null })
    .eq("id", userId);

  if (updateProfileError) {
    return NextResponse.json(
      { success: false, error: updateProfileError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
