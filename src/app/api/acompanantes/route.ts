import { NextResponse, type NextRequest } from 'next/server';
import { authorizeCompanionRequest, companionError, readCompanionBody, isUuid } from '../../../lib/companions/http';
import { authorizeCompanion, listCompanions } from '../../../lib/companions/repository';

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const auth = await authorizeCompanionRequest(request, false);
    if (auth instanceof NextResponse) return auth;
    const companions = auth.role === 'estudiante' ? await listCompanions(auth.user.sub) : [];
    return NextResponse.json({ data: { username: auth.user.username, companions } });
  } catch { return companionError(500, 'INTERNAL_ERROR', 'No se pudieron consultar los acompañantes.'); }
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const auth = await authorizeCompanionRequest(request);
    if (auth instanceof NextResponse) return auth;
    const body = await readCompanionBody(request);
    if (!body || !isUuid(body.adultId)) return companionError(422, 'VALIDATION_ERROR', 'Selecciona un acompañante válido.');
    const companion = await authorizeCompanion(auth.user.sub, body.adultId);
    if (!companion) return companionError(404, 'NOT_FOUND', 'No se encontró una cuenta de padre, madre o docente.');
    return NextResponse.json({ data: companion });
  } catch { return companionError(500, 'INTERNAL_ERROR', 'No se pudo autorizar al acompañante.'); }
};
