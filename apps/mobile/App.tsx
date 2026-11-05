import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PosturePocScreen } from './src/screen/PosturePocScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <PosturePocScreen />
    </SafeAreaProvider>
  );
}
