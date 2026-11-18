import { render, screen, userEvent } from '@testing-library/react-native';

import AccountScreen from '@/app/(app)/account';

const mockSignOut = jest.fn<Promise<void>, []>();

jest.mock('@/hooks/use-session', () => ({
  useSession: () => ({ status: 'signed-in', email: 'a@b.co', signOut: mockSignOut }),
}));

beforeEach(() => {
  mockSignOut.mockReset();
  mockSignOut.mockResolvedValue();
});

describe('<AccountScreen />', () => {
  test('shows the signed-in email', async () => {
    await render(<AccountScreen />);

    expect(screen.getByText('a@b.co')).toBeOnTheScreen();
  });

  test('Sign out calls the session action once', async () => {
    await render(<AccountScreen />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Sign out' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test('ignores a second press while sign-out is in flight', async () => {
    mockSignOut.mockReturnValue(new Promise(() => {}));
    await render(<AccountScreen />);
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Sign out' });

    await user.press(button);
    await user.press(button);

    expect(button).toBeDisabled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test('stays usable when sign-out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('storage unavailable'));
    await render(<AccountScreen />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });
});
