import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ── Misma utilidad de normalización que el frontend ───────
const normalizar = (str = "") =>
    str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

// ── Redondeo seguro a 2 decimales (evita 0.1+0.2 issues) ──
const r2 = (n) => Math.round(n * 100) / 100;

// ───────────────────────────────────────────────────────────
export async function GET(request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id");
    const puestoId = searchParams.get("puesto_id");
    const creditoId = searchParams.get("credito_id"); // ← NUEVO
    const fecha = searchParams.get("fecha");

    // ── Modo: pagos de un crédito específico ──────────────────
    if (creditoId) {
        const { data: pcRows, error: pcErr } = await supabase
            .from("pago_credito")
            .select("pago_id, monto_aplicado")
            .eq("credito_id", creditoId);

        if (pcErr)
            return NextResponse.json({ error: pcErr.message }, { status: 500 });
        if (!pcRows?.length) return NextResponse.json([]);

        const pagoIds = pcRows.map((r) => r.pago_id);
        const pcMap = Object.fromEntries(
            pcRows.map((r) => [r.pago_id, r.monto_aplicado])
        );

        const { data: pagos, error } = await supabase
            .from("pagos")
            .select("*")
            .in("id", pagoIds)
            .order("creado_en", { ascending: false });

        if (error)
            return NextResponse.json({ error: error.message }, { status: 500 });

        // Enriquecer con monto_aplicado a ESTE crédito
        return NextResponse.json(
            (pagos ?? []).map((p) => ({
                ...p,
                monto_aplicado: pcMap[p.id] ?? null,
            }))
        );
    }

    // ── Modo original: pagos por cliente ─────────────────────
    let query = supabase
        .from("pagos")
        .select("*")
        .order("creado_en", { ascending: false });

    if (clienteId) query = query.eq("cliente_id", clienteId);
    // Fix del bug anterior: aplicar puestoId si viene
    if (puestoId) query = query.eq("puesto_id", puestoId);

    if (clienteId) query = query.eq("cliente_id", clienteId);
    if (puestoId) query = query.eq("puesto_id", puestoId);

    if (fecha) {
        // ← AÑADIR
    const inicio = `${fecha}T00:00:00`;
    const fin = `${fecha}T23:59:59.999`;

        query = query
        .gte("creado_en", inicio)
        .lte("creado_en", fin);
    }

    const { data: pagos, error } = await query;
    if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
    if (!pagos?.length) return NextResponse.json([]);

    const pagoIds = pagos.map((p) => p.id);
    const { data: aplicaciones } = await supabase
        .from("pago_credito")
        .select("pago_id, credito_id, monto_aplicado")
        .in("pago_id", pagoIds);

    const aplicMap = {};
    for (const a of aplicaciones ?? []) {
        if (!aplicMap[a.pago_id]) aplicMap[a.pago_id] = [];
        aplicMap[a.pago_id].push(a);
    }

    return NextResponse.json(
        pagos.map((p) => ({ ...p, aplicaciones: aplicMap[p.id] ?? [] }))
    );
}

// ───────────────────────────────────────────────────────────
export async function POST(request) {
    const supabase = await createClient();
    const body = await request.json();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

    const {
        puesto_id,
        cliente_nombre,
        credito_id,
        monto,
        metodo = "efectivo",
        observacion = null,
        fecha_pago = null,
    } = body;

    if (Number(monto) <= 0) {
        return NextResponse.json(
            { error: "monto debe ser > 0" },
            { status: 400 }
        );
    }

    const montoNum = r2(Number(monto));
    const nombreNorm = normalizar(cliente_nombre);
    const creado_en = fecha_pago
    ? `${fecha_pago}T12:00:00`
    : new Date().toISOString();

    // ────────────────────────────────────────────────────────
    // MODO A: Pago individual → credito_id viene directo
    // ────────────────────────────────────────────────────────
    if (credito_id) {
        const { data: credito, error: credErr } = await supabase
            .from("creditos")
            .select(
                "id, total, cliente_id, cliente_nombre, puesto_id, creado_en"
            )
            .eq("id", credito_id)
            .single();

        if (credErr || !credito)
            return NextResponse.json(
                { error: "Crédito no encontrado" },
                { status: 404 }
            );

        // Calcular saldo actual del crédito
        const { data: pcData } = await supabase
            .from("pago_credito")
            .select("monto_aplicado")
            .eq("credito_id", credito_id);

        const totalPagado = (pcData ?? []).reduce(
            (s, p) => r2(s + Number(p.monto_aplicado)),
            0
        );
        const saldo = r2(Math.max(0, Number(credito.total) - totalPagado));

        if (saldo <= 0)
            return NextResponse.json(
                { error: "Este crédito ya está saldado" },
                { status: 400 }
            );

        const aplicar = r2(Math.min(montoNum, saldo));

        // Insertar pago
            const { data: pago, error: pagoError } = await supabase
            .from("pagos")
            .insert([
                {
                cliente_id: credito.cliente_id,
                cliente_nombre: credito.cliente_nombre,
                monto: montoNum,
                metodo,
                observacion: observacion?.trim() || null,
                creado_en,
                company_id: profile.company_id,
                },
            ])
            .select()
            .single();

        if (pagoError)
            return NextResponse.json(
                { error: pagoError.message },
                { status: 500 }
            );

        // Insertar pago_credito
        const { data: aplicacionesData, error: aplicError } = await supabase
            .from("pago_credito")
            .insert([
                {
                    pago_id: pago.id,
                    credito_id,
                    monto_aplicado: aplicar,
                    company_id: profile.company_id,
                },
            ])
            .select();

        if (aplicError) {
            await supabase.from("pagos").delete().eq("id", pago.id);
            return NextResponse.json(
                { error: aplicError.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                pago,
                aplicaciones: aplicacionesData,
                resumen: {
                    cliente_id: credito.cliente_id,
                    cliente_nombre: credito.cliente_nombre,
                    monto_pagado: montoNum,
                    creditos_afectados: 1,
                    deuda_previa: saldo,
                    deuda_restante: r2(Math.max(0, saldo - montoNum)),
                    excedente: r2(Math.max(0, montoNum - saldo)),
                },
            },
            { status: 201 }
        );
    }

    // ────────────────────────────────────────────────────────
    // MODO B: Pago global → waterfall por cliente/puesto
    // ────────────────────────────────────────────────────────
    if (!puesto_id?.trim() || !cliente_nombre?.trim()) {
        return NextResponse.json(
            {
                error: "puesto_id y cliente_nombre son requeridos para pagos globales",
            },
            { status: 400 }
        );
    }

    // ── 1. Resolver cliente_id desde tabla clientes ──────────
    const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("puesto_id", puesto_id);

    const clienteMatch =
        (clientesData ?? []).find((c) => normalizar(c.nombre) === nombreNorm) ??
        (clientesData ?? []).find((c) =>
            normalizar(c.nombre).startsWith(nombreNorm)
        ) ??
        (clientesData ?? []).find((c) =>
            nombreNorm.includes(normalizar(c.nombre).split(" ")[0])
        );

    const cliente_id = clienteMatch?.id ?? null;
    const nombre_final = clienteMatch?.nombre ?? cliente_nombre.trim();

    // ── 2. Obtener créditos del puesto y filtrar por cliente ──
    const { data: todosCreditos, error: creditosError } = await supabase
        .from("creditos")
        .select("id, total, cliente_id, cliente_nombre, creado_en")
        .eq("puesto_id", puesto_id)
        .order("creado_en", { ascending: true }); // ← más antiguo primero (FIFO)

    if (creditosError)
        return NextResponse.json(
            { error: creditosError.message },
            { status: 500 }
        );

    // Filtrar por cliente (por id si existe, sino por nombre normalizado)
    const creditosDelCliente = (todosCreditos ?? []).filter(
        (c) =>
            (cliente_id && c.cliente_id === cliente_id) ||
            normalizar(c.cliente_nombre) === nombreNorm
    );

    if (!creditosDelCliente.length) {
        return NextResponse.json(
            {
                error: `No se encontraron créditos para "${nombre_final}" en puesto ${puesto_id}`,
            },
            { status: 404 }
        );
    }

    // ── 3. Calcular saldo pendiente de cada crédito ──────────
    const creditoIds = creditosDelCliente.map((c) => c.id);
    const { data: pagoCreditoData } = await supabase
        .from("pago_credito")
        .select("credito_id, monto_aplicado")
        .in("credito_id", creditoIds);

    const pagadoMap = {};
    for (const pc of pagoCreditoData ?? []) {
        pagadoMap[pc.credito_id] = r2(
            (pagadoMap[pc.credito_id] ?? 0) + Number(pc.monto_aplicado ?? 0)
        );
    }

    const creditosPendientes = creditosDelCliente
        .map((c) => ({
            ...c,
            total_pagado: pagadoMap[c.id] ?? 0,
            saldo: r2(Math.max(0, Number(c.total) - (pagadoMap[c.id] ?? 0))),
        }))
        .filter((c) => c.saldo > 0);

    if (!creditosPendientes.length) {
        return NextResponse.json(
            {
                error: `"${nombre_final}" no tiene créditos pendientes en puesto ${puesto_id}`,
            },
            { status: 400 }
        );
    }

    // ── 4. Insertar el pago ──────────────────────────────────
    const { data: pago, error: pagoError } = await supabase
        .from("pagos")
        .insert([
            {
                cliente_id,
                cliente_nombre: nombre_final,
                //puesto_id,
                monto: montoNum,
                metodo,
                observacion: observacion?.trim() || null,
                creado_en,
                company_id: profile.company_id,
            },
        ])
        .select()
        .single();

    if (pagoError)
        return NextResponse.json({ error: pagoError.message }, { status: 500 });

    // ── 5. Algoritmo waterfall ───────────────────────────────
    //
    //  Caso A: 1 crédito, paga completo  → saldo = 0, 1 fila pago_credito
    //  Caso B: 1 crédito, paga parcial   → saldo > 0, 1 fila pago_credito
    //  Caso C: N créditos, pago >= C1    → C1 queda 0, excedente a C2, etc.
    //
    const filasPagoCredito = [];
    let restante = montoNum;

    for (const credito of creditosPendientes) {
        if (restante <= 0) break;

        const aplicar = r2(Math.min(restante, credito.saldo));

        filasPagoCredito.push({
            pago_id: pago.id,
            credito_id: credito.id,
            monto_aplicado: aplicar,
            company_id: profile.company_id,
        });

        restante = r2(restante - aplicar);
    }

    // ── 6. Insertar en pago_credito (batch) ──────────────────
    const { data: aplicacionesData, error: aplicError } = await supabase
        .from("pago_credito")
        .insert(filasPagoCredito)
        .select();

    if (aplicError) {
        // Rollback: eliminar el pago recién creado
        await supabase.from("pagos").delete().eq("id", pago.id);
        return NextResponse.json(
            { error: aplicError.message },
            { status: 500 }
        );
    }

    // ── 7. Respuesta enriquecida ─────────────────────────────
    const deudaTotal = creditosPendientes.reduce((s, c) => s + c.saldo, 0);

    return NextResponse.json(
        {
            pago,
            aplicaciones: aplicacionesData,
            resumen: {
                cliente_id,
                cliente_nombre: nombre_final,
                monto_pagado: montoNum,
                creditos_afectados: filasPagoCredito.length,
                deuda_previa: r2(deudaTotal),
                deuda_restante: r2(Math.max(0, deudaTotal - montoNum)),
                excedente: r2(Math.max(0, montoNum - deudaTotal)), // pagó de más
            },
        },
        { status: 201 }
    );
}
