/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marca do LoriFat: a letra L que termina num visto de "pago".
 */

import React, { useId } from 'react';

export function LogoMark({ className, title = 'LoriFat' }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id={`lg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a3c" />
          <stop offset="1" stopColor="#ff7a00" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={`url(#lg${id})`} />
      <path d="M31 22 V68 H55 L77 38" fill="none" stroke="#fff" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
