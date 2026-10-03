/** Ruta de inicio según los roles: operación para ADMIN/PROFESSIONAL, portal para USER. */
export function roleHome(roles: readonly string[]): string {
  if (roles.includes('ADMIN') || roles.includes('PROFESSIONAL')) return '/operacion';
  if (roles.includes('USER')) return '/inicio';
  return '/perfil';
}

/** Acepta solo rutas internas para evitar redirecciones abiertas. */
export function safeReturnUrl(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.startsWith('/login') || value.startsWith('/registro')) return null;
  return value;
}
