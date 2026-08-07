import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/account');
vi.mock('../stores/authStore');

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

import * as accountApi from '../api/account';
import { useAuthStore } from '../stores/authStore';
import Account from './Account';

const EMAIL = 'lifter@example.com';
const logout = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuthStore).mockReturnValue({
    user: { email: EMAIL },
    accessToken: 'token',
    logout,
  } as unknown as ReturnType<typeof useAuthStore>);
  vi.mocked(accountApi.fetchAccountExport).mockResolvedValue({ profile: { email: EMAIL } });
  vi.mocked(accountApi.deleteAccount).mockResolvedValue(undefined);
});

const openConfirm = () => fireEvent.click(screen.getByRole('button', { name: /delete my account/i }));
const typeEmail = (value: string) =>
  fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value } });
const deleteButton = () => screen.getByRole('button', { name: /permanently delete/i });

describe('Account export', () => {
  it('downloads the data it fetched', async () => {
    render(<Account />);
    fireEvent.click(screen.getByRole('button', { name: /download my data/i }));

    await waitFor(() => expect(accountApi.downloadExport).toHaveBeenCalled());
    const [data, filename] = vi.mocked(accountApi.downloadExport).mock.calls[0];
    expect(data).toEqual({ profile: { email: EMAIL } });
    expect(filename).toMatch(/\.json$/);
  });

  it('reports a failure rather than pretending it saved', async () => {
    vi.mocked(accountApi.fetchAccountExport).mockRejectedValue({ detail: 'nope', status: 500 });
    render(<Account />);
    fireEvent.click(screen.getByRole('button', { name: /download my data/i }));

    expect(await screen.findByText(/nope/i)).toBeInTheDocument();
    expect(accountApi.downloadExport).not.toHaveBeenCalled();
    expect(screen.queryByText(/saved to your downloads/i)).not.toBeInTheDocument();
  });
});

describe('Account deletion', () => {
  it('takes two steps to reach', () => {
    render(<Account />);
    // The destructive button is not the one sitting on the page
    expect(screen.queryByRole('button', { name: /permanently delete/i })).not.toBeInTheDocument();
    openConfirm();
    expect(deleteButton()).toBeInTheDocument();
  });

  it('stays disabled until the email matches', () => {
    render(<Account />);
    openConfirm();
    expect(deleteButton()).toBeDisabled();

    typeEmail('someone.else@example.com');
    expect(deleteButton()).toBeDisabled();

    typeEmail(EMAIL);
    expect(deleteButton()).toBeEnabled();
  });

  it('accepts the email in any case, with stray spacing', () => {
    render(<Account />);
    openConfirm();
    typeEmail(`  ${EMAIL.toUpperCase()} `);
    expect(deleteButton()).toBeEnabled();
  });

  it('signs out and leaves once the account is gone', async () => {
    render(<Account />);
    openConfirm();
    typeEmail(EMAIL);
    fireEvent.click(deleteButton());

    await waitFor(() => expect(accountApi.deleteAccount).toHaveBeenCalledWith('token', EMAIL));
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('keeps the session when the server refuses', async () => {
    vi.mocked(accountApi.deleteAccount).mockRejectedValue({
      detail: 'We could not close your billing',
      status: 502,
    });
    render(<Account />);
    openConfirm();
    typeEmail(EMAIL);
    fireEvent.click(deleteButton());

    expect(await screen.findByText(/could not close your billing/i)).toBeInTheDocument();
    // Signing them out of an account that still exists would strand them
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('can be backed out of', () => {
    render(<Account />);
    openConfirm();
    typeEmail(EMAIL);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('button', { name: /permanently delete/i })).not.toBeInTheDocument();
    expect(accountApi.deleteAccount).not.toHaveBeenCalled();
  });
});
