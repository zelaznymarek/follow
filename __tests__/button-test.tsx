import { render, screen } from '@testing-library/react-native';

import { Button } from '@/components/button';
import { Colors } from '@/constants/theme';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => mockScheme,
}));

describe('<Button />', () => {
  test.each(['light', 'dark'] as const)(
    'primary (default) uses primary and onPrimary in %s',
    async (scheme) => {
      mockScheme = scheme;
      await render(<Button title="Save" onPress={jest.fn()} />);

      expect(screen.getByRole('button', { name: 'Save' })).toHaveStyle({
        backgroundColor: Colors[scheme].primary,
      });
      expect(screen.getByText('Save')).toHaveStyle({ color: Colors[scheme].onPrimary });
    }
  );

  test.each(['light', 'dark'] as const)(
    'secondary uses backgroundSelected and text in %s',
    async (scheme) => {
      mockScheme = scheme;
      await render(<Button title="Retry" onPress={jest.fn()} variant="secondary" />);

      expect(screen.getByRole('button', { name: 'Retry' })).toHaveStyle({
        backgroundColor: Colors[scheme].backgroundSelected,
      });
      expect(screen.getByText('Retry')).toHaveStyle({ color: Colors[scheme].text });
    }
  );
});
