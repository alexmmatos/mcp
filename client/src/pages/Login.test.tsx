import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api', () => ({
  default: { post: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import api from '../api';
import Login from './Login';

const renderLogin = () => render(<Login />, { wrapper: MemoryRouter });

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders username and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    renderLogin();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('shows error alert on failed login', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('401'));
    renderLogin();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'bad' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid username or password.')).toBeInTheDocument();
    });
  });

  it('stores token and navigates to / on successful login', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { access_token: 'tok123' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('tok123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('disables the submit button while the request is pending', async () => {
    let resolvePost: (v: any) => void;
    (api.post as ReturnType<typeof vi.fn>).mockReturnValue(new Promise((r) => { resolvePost = r; }));
    renderLogin();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // After submit, button shows CircularProgress so name changes — query by type
    await waitFor(() => {
      const submit = document.querySelector('button[type="submit"]');
      expect(submit).toBeDisabled();
    });

    resolvePost!({ data: { access_token: 'tok' } });
  });

  it('calls /auth/login endpoint with provided credentials', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { access_token: 'tok' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'myuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'mypass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', { username: 'myuser', password: 'mypass' });
    });
  });
});
