import { NextResponse, type NextRequest } from 'next/server';
import { authorizeCompanionRequest, companionError, isUuid } from '../../../../lib/companions/http';
import { revokeCompanion } from '../../../../lib/companions/repository';

export const DELETE = async (request: NextRequest, context: { params: Promise<{ adultId: string }> }): Promise<NextResponse> => {
  try {
    const auth = await authorizeCompanionRequest(request);
    if (auth instanceof NextResponse) return auth;
    const { adultId } = await context.params;
    if (!isUuid(adultId)) return companionError(422, 'VALIDATION_ERROR', 'Selecciona un acompañante válido.');
    await revokeCompanion(auth.user.sub, adultId);
    return new NextResponse(null, { status: 204 });
  } catch { return companionError(500, 'INTERNAL_ERROR', 'No se pudo retirar el acceso.'); }
};
