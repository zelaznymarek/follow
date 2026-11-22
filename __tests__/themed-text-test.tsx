import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => mockScheme,
}));

describe('<ThemedText />', () => {
  test.each(['light', 'dark'] as const)('linkPrimary uses primary in %s', async (scheme) => {
    mockScheme = scheme;
    await render(<ThemedText type="linkPrimary">Create account</ThemedText>);

    expect(screen.getByText('Create account')).toHaveStyle({ color: Colors[scheme].primary });
  });

  test('an explicit themeColor overrides the linkPrimary accent', async () => {
    mockScheme = 'light';
    await render(
      <ThemedText type="linkPrimary" themeColor="textSecondary">
        Create account
      </ThemedText>
    );

    expect(screen.getByText('Create account')).toHaveStyle({
      color: Colors.light.textSecondary,
    });
  });
});
