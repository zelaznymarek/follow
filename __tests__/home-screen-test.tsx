import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/(app)/index';

describe('<HomeScreen />', () => {
  test('renders the welcome title', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText(/Welcome to/)).toBeOnTheScreen();
  });
});
