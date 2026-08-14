import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { PasswordInput } from '../PasswordInput';

function TestWrapper(props: Partial<React.ComponentProps<typeof PasswordInput>>) {
  const [val, setVal] = useState('');
  return (
    <PasswordInput
      value={val}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVal(e.target.value)}
      placeholder="Enter password"
      {...props}
    />
  );
}

describe('PasswordInput Component', () => {
  it('renders with type="password" by default', () => {
    render(<TestWrapper />);
    const input = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('password');
  });

  it('renders a toggle button with type="button" and initial aria-label', () => {
    render(<TestWrapper />);
    const toggleButton = screen.getByRole('button', { name: /hiện mật khẩu/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.getAttribute('type')).toBe('button');
  });

  it('toggles password visibility when toggle button is clicked', () => {
    render(<TestWrapper />);
    const input = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /hiện mật khẩu/i });

    // Initial state: password hidden
    expect(input.type).toBe('password');

    // First click: show password
    fireEvent.click(toggleButton);
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: /ẩn mật khẩu/i })).toBeInTheDocument();

    // Second click: hide password again
    fireEvent.click(toggleButton);
    expect(input.type).toBe('password');
    expect(screen.getByRole('button', { name: /hiện mật khẩu/i })).toBeInTheDocument();
  });

  it('handles user input correctly', () => {
    render(<TestWrapper />);
    const input = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Secret123!' } });
    expect(input.value).toBe('Secret123!');
  });
});
