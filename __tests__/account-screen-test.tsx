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
});
