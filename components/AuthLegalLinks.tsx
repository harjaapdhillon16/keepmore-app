import { Linking, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { theme } from '../constants/theme'

type Align = 'left' | 'center'

type AuthLegalLinksProps = {
  align?: Align
  variant?: 'standalone' | 'agreement'
}

export default function AuthLegalLinks({
  align = 'center',
  variant = 'standalone',
}: AuthLegalLinksProps) {
  const isCentered = align === 'center'
  const separator = variant === 'agreement' ? ' and ' : ' • '
  const trailing = variant === 'agreement' ? '.' : ''

  return (
    <View style={[styles.container, isCentered ? styles.centered : styles.left]}>
      <Text style={[styles.text, isCentered ? styles.textCentered : styles.textLeft]}>
        {variant === 'agreement' ? 'By continuing, you agree to our ' : ''}
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => Linking.openURL('https://www.keepmore.finance/terms')}
        >
          Terms of Service
        </Text>
        {separator}
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => Linking.openURL('https://www.keepmore.finance/privacy')}
        >
          Privacy Policy
        </Text>
        {trailing}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  centered: {
    alignItems: 'center',
  },
  left: {
    alignItems: 'flex-start',
  },
  text: {
    fontFamily: theme.fonts.body.regular,
    fontSize: 12,
    color: theme.colors.mutedLight,
  },
  textCentered: {
    textAlign: 'center',
  },
  textLeft: {
    textAlign: 'left',
  },
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
})
