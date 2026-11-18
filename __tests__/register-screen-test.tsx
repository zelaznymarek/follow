import { render, screen, userEvent } from '@testing-library/react-native';

import RegisterScreen from '@/app/register';
import type { AuthResult } from '@/hooks/use-session';

const mockRegister = jest.fn<Promise<AuthResult>, [string, string]>();

jest.mock('@/hooks/use-session', () => ({
  useSession: () => ({ register: mockRegister }),
}));

const WEAK_PASSWORD = 'Use at least 8 characters, including letters and digits.';

beforeEach(() => {
  mockRegister.mockReset();
  mockRegister.mockResolvedValue({ ok: true });
});

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.press(screen.getByRole('button', { name: 'Create account' }));
}

describe('<RegisterScreen />', () => {
  test('rejects a 7-character password', async () => {
    await render(<RegisterScreen />);

    await fillAndSubmit('new@b.co', 'abc1234');

    expect(screen.getByText(WEAK_PASSWORD)).toBeOnTheScreen();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('rejects a password without digits', async () => {
    await render(<RegisterScreen />);

    await fillAndSubmit('new@b.co', 'abcdefgh');

    expect(screen.getByText(WEAK_PASSWORD)).toBeOnTheScreen();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('rejects a malformed email', async () => {
    await render(<RegisterScreen />);

    await fillAndSubmit('new@b', 'abcd1234');

    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('accepts abcd1234 and sends the trimmed email', async () => {
    await render(<RegisterScreen />);

    await fillAndSubmit(' new@b.co ', 'abcd1234');

    expect(screen.queryByText(WEAK_PASSWORD)).not.toBeOnTheScreen();
    expect(mockRegister).toHaveBeenCalledWith('new@b.co', 'abcd1234');
  });

  test('shows the message from a failed register', async () => {
    mockRegister.mockResolvedValue({
      ok: false,
      message: 'An account with this email already exists. Try signing in instead.',
    });
    await render(<RegisterScreen />);

    await fillAndSubmit('taken@b.co', 'abcd1234');

    expect(
      await screen.findByText('An account with this email already exists. Try signing in instead.')
    ).toBeOnTheScreen();
  });
});
