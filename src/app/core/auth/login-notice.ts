/** Parámetro de consulta con el aviso a mostrar en `/login`. */
export const LOGIN_NOTICE_PARAM = 'aviso';

export type LoginNotice = 'sesion-expirada' | 'registro-exitoso' | 'contrasena-actualizada';

export const LOGIN_NOTICES: Record<LoginNotice, { kind: 'info' | 'success'; title: string; message: string }> = {
  'sesion-expirada': {
    kind: 'info',
    title: 'Sesión expirada',
    message: 'Tu sesión expiró por seguridad. Inicia sesión nuevamente para continuar.',
  },
  'registro-exitoso': {
    kind: 'success',
    title: '¡Cuenta creada exitosamente!',
    message: 'Ya puedes iniciar sesión con tu correo electrónico y contraseña.',
  },
  'contrasena-actualizada': {
    kind: 'success',
    title: 'Contraseña actualizada',
    message: 'Inicia sesión con tu nueva contraseña.',
  },
};

export function isLoginNotice(value: unknown): value is LoginNotice {
  return typeof value === 'string' && value in LOGIN_NOTICES;
}
