import { HttpInterceptorFn } from '@angular/common/http';

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken = sessionStorage.getItem('fcv.access-token');
  if (!accessToken || request.url.includes('/auth/')) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }));
};
