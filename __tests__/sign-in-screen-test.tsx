import { render, screen, userEvent } from '@testing-library/react-native';

import SignInScreen from '@/app/sign-in';
import type { AuthResult } from '@/hooks/use-session';

const mockSignIn = jest.fn<Promise<AuthResult>, [string, string]>();

jest.mock('@/hooks/use-session', () => ({
  useSession: () => ({ signIn: mockSignIn }),
}));

beforeEach(() => {
  mockSignIn.mockReset();
});

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
}

describe('<SignInScreen />', () => {
  test('submit calls signIn with the trimmed email', async () => {
    mockSignIn.mockResolvedValue({ ok: true });
    await render(<SignInScreen />);

    await fillAndSubmit('  a@b.co  ', 'secret123');

    expect(mockSignIn).toHaveBeenCalledWith('a@b.co', 'secret123');
  });

  test('shows the message from a failed signIn', async () => {
    mockSignIn.mockResolvedValue({ ok: false, message: 'Wrong email or password.' });
    await render(<SignInScreen />);

    await fillAndSubmit('a@b.co', 'wrong-password1');

    expect(await screen.findByText('Wrong email or password.')).toBeOnTheScreen();
  });

  test('requires a well-formed email and a password before sending', async () => {
    await render(<SignInScreen />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen();

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  test('disables submit while the request is in flight', async () => {
    mockSignIn.mockReturnValue(new Promise(() => {}));
    await render(<SignInScreen />);

    await fillAndSubmit('a@b.co', 'secret123');

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();

    // A second submit while in flight must not send again.
    await userEvent.setup().press(screen.getByRole('button', { name: 'Sign in' }));
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });
});
