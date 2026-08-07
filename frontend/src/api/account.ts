/**
 * Export and deletion, the two rights the privacy policy has to honour.
 */

import { del, get } from './client';

/** Shape is deliberately loose: the export is column-driven on the server, so
 * pinning every field here would mean editing this file every time a column is
 * added, and the client only ever hands the whole thing to the user. */
export type AccountExport = Record<string, unknown>;

export async function fetchAccountExport(token: string): Promise<AccountExport> {
  return get<AccountExport>('/v1/account/export', token);
}

export async function deleteAccount(token: string, confirmEmail: string): Promise<void> {
  await del<null>('/v1/account', token, { confirm_email: confirmEmail });
}

/**
 * Save the export to the user's device.
 *
 * Built client-side rather than following the endpoint as a link because the
 * request needs an Authorization header, which a plain anchor cannot send.
 */
export function downloadExport(data: AccountExport, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoking immediately can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
