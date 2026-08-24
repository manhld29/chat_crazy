import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ResetPasswordPage from '../page';
import { api } from '@/lib/api';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (param: string) => (param === 'token' ? 'valid-test-token' : null),
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock api
vi.mock('@/lib/api', () => ({
  api: {
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordPage', () => {
  it('renders password reset form when token is present', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText('Đặt lại mật khẩu')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('••••••••').length).toBe(2);
  });

  it('validates password match before submission', async () => {
    render(<ResetPasswordPage />);
    const inputs = screen.getAllByPlaceholderText('••••••••') as HTMLInputElement[];
    const newPassInput = inputs[0];
    const confirmPassInput = inputs[1];
    const submitBtn = screen.getByRole('button', { name: /cập nhật mật khẩu mới/i });

    fireEvent.change(newPassInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPassInput, { target: { value: 'password456' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu xác nhận không khớp với mật khẩu mới.')).toBeInTheDocument();
    });
  });

  it('submits reset password request successfully', async () => {
    vi.mocked(api.resetPassword).mockResolvedValueOnce({
      message: 'Đặt lại mật khẩu thành công.',
    });

    render(<ResetPasswordPage />);
    const inputs = screen.getAllByPlaceholderText('••••••••') as HTMLInputElement[];
    const newPassInput = inputs[0];
    const confirmPassInput = inputs[1];
    const submitBtn = screen.getByRole('button', { name: /cập nhật mật khẩu mới/i });

    fireEvent.change(newPassInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPassInput, { target: { value: 'newPassword123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith({
        token: 'valid-test-token',
        new_password: 'newPassword123',
      });
      expect(screen.getByText('Thành công!')).toBeInTheDocument();
    });
  });
});
