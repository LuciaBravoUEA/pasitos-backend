import { NextResponse, type NextRequest } from 'next/server';
import { authorizeCompanionRequest, companionError, readCompanionBody } from '../../../../lib/companions/http';
import { findCompanion } from '../../../../lib/companions/repository';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const auth = await authorizeCompanionRequest(request);
    if (auth instanceof NextResponse) return auth;
    const body = await readCompanionBody(request);
    if (!body || typeof body.username !== 'string' || !body.username.trim() || body.username.trim().length > 100) return companionError(422, 'VALIDATION_ERROR', 'Escribe el usuario exacto del adulto (hasta 100 caracteres).');
    const companion = await findCompanion(body.username);
    if (!companion) return companionError(404, 'NOT_FOUND', 'No se encontró una cuenta de padre, madre o docente con ese usuario.');
    return NextResponse.json({ data: companion });
  } catch { return companionError(500, 'INTERNAL_ERROR', 'No se pudo buscar al acompañante.'); }
};
