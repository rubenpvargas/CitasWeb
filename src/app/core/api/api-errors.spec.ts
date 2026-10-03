import { HttpErrorResponse } from '@angular/common/http';
import { errorCode, errorMessage, fieldErrors, toProblem } from './api-errors';

function problem(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, url: 'http://api.test/x' });
}

describe('api-errors', () => {
  it('extrae Problem Details con code', () => {
    const p = toProblem(problem(401, { status: 401, title: 'Invalid credentials', detail: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }));
    expect(p).toEqual(expect.objectContaining({ status: 401, code: 'INVALID_CREDENTIALS', title: 'Invalid credentials' }));
  });

  it('traduce códigos conocidos a mensajes en español sin exponer el detalle técnico', () => {
    const msg = errorMessage(problem(401, { code: 'INVALID_CREDENTIALS', detail: 'Invalid credentials' }));
    expect(msg).toBe('Correo electrónico o contraseña incorrectos. Por favor verifica tus datos.');
    expect(errorMessage(problem(409, { code: 'INVALID_RESET_TOKEN' }))).toMatch(/enlace de recuperación/);
    expect(errorMessage(problem(409, { code: 'IDENTIFIER_ALREADY_REGISTERED' }))).toMatch(/Ya existe una cuenta/);
  });

  it('usa NETWORK_ERROR para status 0', () => {
    const err = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
    expect(errorCode(err)).toBe('NETWORK_ERROR');
    expect(errorMessage(err)).toMatch(/conectar con el servidor/);
  });

  it('usa SERVER_ERROR para 5xx sin code', () => {
    expect(errorCode(problem(500, 'boom'))).toBe('SERVER_ERROR');
    expect(errorMessage(problem(503, null))).toMatch(/error inesperado/);
  });

  it('deriva un código por estado cuando falta code', () => {
    expect(errorCode(problem(403, {}))).toBe('FORBIDDEN');
    expect(errorCode(problem(404, {}))).toBe('NOT_FOUND');
    expect(errorCode(problem(400, {}))).toBe('INVALID_REQUEST');
  });

  it('usa el fallback para códigos desconocidos', () => {
    expect(errorMessage(problem(409, { code: 'ALGO_NUEVO' }), 'Mensaje propio')).toBe('Mensaje propio');
    expect(errorMessage(new Error('x'))).toMatch(/No fue posible completar/);
  });

  it('lista los campos con error de validación', () => {
    const err = problem(400, { code: 'VALIDATION_ERROR', errors: [{ field: 'email', message: 'must be a well-formed email address' }, { bad: 1 }] });
    expect(fieldErrors(err)).toEqual(['email']);
  });
});
