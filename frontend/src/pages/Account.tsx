import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { apiErrorDetail } from '../api/client';
import { deleteAccount, downloadExport, fetchAccountExport } from '../api/account';

/**
 * Account page: take your data out, or close the account.
 *
 * These exist because the privacy policy promised both, and for a while
 * honoured them by email. Keeping deletion here rather than in the nav menu is
 * deliberate: it sits behind a typed confirmation, next to an explicit list of
 * what goes, rather than one slip away from the unit toggle.
 */
export default function Account() {
  const { user, accessToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typedEmail, setTypedEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const email = user?.email ?? '';
  const confirmed = typedEmail.trim().toLowerCase() === email.toLowerCase() && email !== '';

  const handleExport = async () => {
    if (!accessToken) return;
    setExporting(true);
    setExportError(null);
    setExported(false);
    try {
      const data = await fetchAccountExport(accessToken);
      downloadExport(data, `strength-guider-export-${new Date().toISOString().slice(0, 10)}.json`);
      setExported(true);
    } catch (err) {
      setExportError(apiErrorDetail(err, 'Could not build your export. Please try again.'));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !confirmed) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(accessToken, typedEmail.trim());
      // The account is gone, so there is nothing left to sign out of on the
      // server. Clear local state and send them to the page for strangers.
      logout();
      navigate('/');
    } catch (err) {
      setDeleteError(apiErrorDetail(err, 'Could not delete your account. Please try again.'));
      setDeleting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Account</h1>
      <p className="text-gray-400 mb-8">{email}</p>

      <section className="bg-gray-800 rounded-lg p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Download your data</h2>
        <p className="text-sm text-gray-400 mb-4">
          Everything we hold about you as a single JSON file: your profile, your training
          blocks, every session and every set you have logged, and any exercises you added
          yourself. The stock exercise library is left out, it is the same for everyone and
          it is not your data.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded transition-colors"
        >
          {exporting ? 'Preparing...' : 'Download my data'}
        </button>
        {exported && (
          <p className="text-sm text-teal-300 mt-3">Saved to your downloads.</p>
        )}
        {exportError && <p className="text-sm text-red-400 mt-3">{exportError}</p>}
      </section>

      <section className="bg-gray-800 rounded-lg p-5 border border-red-900">
        <h2 className="text-lg font-semibold text-white mb-2">Delete your account</h2>
        <p className="text-sm text-gray-400 mb-3">
          This removes your account and everything attached to it: your training blocks,
          your logged sets and your custom exercises. It cannot be undone, and we cannot
          recover it for you afterwards.
        </p>
        <p className="text-sm text-gray-400 mb-4">
          Any subscription is cancelled at the same time. If you want a copy of your
          training history, download it first.
        </p>

        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            className="border border-red-500 text-red-400 hover:bg-red-500 hover:text-white font-medium px-4 py-2 rounded transition-colors"
          >
            Delete my account
          </button>
        ) : (
          <div>
            <label htmlFor="confirm-email" className="block text-sm text-gray-300 mb-2">
              Type <span className="text-white font-medium">{email}</span> to confirm.
            </label>
            <input
              id="confirm-email"
              type="email"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              autoComplete="off"
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
              placeholder={email}
            />
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleDelete}
                disabled={!confirmed || deleting}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-medium px-4 py-2 rounded transition-colors"
              >
                {deleting ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setTypedEmail('');
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="text-gray-300 hover:text-white px-4 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
            {deleteError && <p className="text-sm text-red-400 mt-3">{deleteError}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
